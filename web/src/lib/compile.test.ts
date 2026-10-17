import { describe, expect, it } from "vitest";
import { compile } from "./engine";
import { getManifest } from "./manifest";
import { anglePlan, DEFAULT_SHOT, framesFor, movePlan } from "./shot";

type Graph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

describe("shot compiler", () => {
  it("builds the multi-angle LoRA prompt from the manifest grammar", async () => {
    const m = await getManifest();
    const p = anglePlan({ ...DEFAULT_SHOT, azimuth: "back-left", elevation: "high", distance: "wide" }, m.angleGrammar);
    expect(p.prompt).toBe("<sks> back-left quarter view high-angle shot wide shot");
  });

  it("covers all 96 angle combinations without throwing", async () => {
    const g = (await getManifest()).angleGrammar;
    const prompts = new Set(
      g.azimuths.flatMap((a) => g.elevations.flatMap((e) => g.distances.map((d) => anglePlan({ ...DEFAULT_SHOT, azimuth: a.id, elevation: e.id, distance: d.id }, g).prompt))),
    );
    expect(prompts.size).toBe(96);
  });

  it("uses LTX-friendly 8n+1 frame counts", () => {
    for (const s of [3, 5, 8]) expect((framesFor(s) - 1) % 8).toBe(0);
    expect(framesFor(5)).toBe(121);
  });

  it("rejects unknown ids", async () => {
    const m = await getManifest();
    expect(() => anglePlan({ ...DEFAULT_SHOT, azimuth: "nope" }, m.angleGrammar)).toThrow(/azimuth/);
  });
});

describe("workflow binding", () => {
  it("binds angle inputs onto the right nodes", async () => {
    const m = await getManifest();
    const plan = anglePlan({ ...DEFAULT_SHOT, seed: 7 }, m.angleGrammar);
    const g = (await compile("angle", plan, "subject.png")).json as Graph;
    expect(g[m.angle.inputs.image.node].inputs.image).toBe("subject.png");
    expect(g[m.angle.inputs.prompt.node].inputs[m.angle.inputs.prompt.field]).toBe(plan.prompt);
    expect(g[m.angle.inputs.seed.node].inputs.seed).toBe(7);
  });

  it("does not mutate the shared template graph", async () => {
    const m = await getManifest();
    await compile("angle", anglePlan({ ...DEFAULT_SHOT, seed: 99 }, m.angleGrammar), "a.png");
    const g = (await compile("angle", anglePlan({ ...DEFAULT_SHOT, seed: 1 }, m.angleGrammar), "b.png")).json as Graph;
    expect(g[m.angle.inputs.seed.node].inputs.seed).toBe(1);
  });

  it.each(["dolly-in", "pan-left", "handheld"])("binds move %s with the right LoRA strength", async (move) => {
    const m = await getManifest();
    const plan = movePlan({ ...DEFAULT_SHOT, move, aspect: "9:16", duration: 3 }, m.cameraMoves);
    const g = (await compile("move", plan, "still.png")).json as Graph;
    const b = m.move.inputs;
    const lora = g[b.cameraLoraStrength.node].inputs;
    const def = m.cameraMoves.find((c) => c.id === move)!;
    expect(lora[b.cameraLoraStrength.field]).toBe(def.lora ? 1 : 0);
    if (def.lora) expect(lora[b.cameraLora.field]).toBe(def.lora);
    expect(g[b.width.node].inputs[b.width.field]).toBe(704);
    expect(g[b.height.node].inputs[b.height.field]).toBe(1280);
    expect(g[b.frames.node].inputs[b.frames.field]).toBe(73);
    const prompt = String(g[b.prompt.node].inputs[b.prompt.field]);
    expect(prompt).toContain(def.prompt.replace(/\.$/, ""));
    expect(prompt).not.toMatch(/\.\./);
  });
});

describe("workflow variants", () => {
  it("swaps only the loader for the gguf variant, keeping every binding", async () => {
    const m = await getManifest();
    const plan = anglePlan({ ...DEFAULT_SHOT, seed: 3 }, m.angleGrammar);
    const base = (await compile("angle", plan, "s.png")).json as Graph;
    process.env.COMFY_WORKFLOW_VARIANT = "gguf";
    try {
      const gguf = (await compile("angle", plan, "s.png")).json as Graph;
      const changed = Object.keys(base).filter((id) => JSON.stringify(base[id]) !== JSON.stringify(gguf[id]));
      expect(changed).toHaveLength(1);
      expect(gguf[changed[0]].class_type).toBe("UnetLoaderGGUF");
    } finally {
      delete process.env.COMFY_WORKFLOW_VARIANT;
    }
  });

  it("rejects an unknown variant loudly", async () => {
    process.env.COMFY_WORKFLOW_VARIANT = "nope";
    try {
      await expect(compile("angle", { prompt: "x", seed: 1 }, "s.png")).rejects.toThrow(/COMFY_WORKFLOW_VARIANT/);
    } finally {
      delete process.env.COMFY_WORKFLOW_VARIANT;
    }
  });
});
