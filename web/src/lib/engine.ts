import "server-only";
import { Comfy, ComfyError, Workflow } from "@comfyorg/sdk";
import { getManifest, loadGraph, type Stage } from "./manifest";
import type { AnglePlan, MovePlan } from "./shot";

import type { EngineMode } from "./config";

export function engineMode(): EngineMode {
  if (process.env.COMFY_API_KEY?.trim()) return "cloud";
  if (process.env.COMFY_BASE_URL?.trim()) return "local";
  return "dryrun";
}

let client: Comfy | null = null;
function comfy(): Comfy {
  client ??= new Comfy({ clientInfo: "open-higgsfield" });
  return client;
}

export type ImageSource =
  | { kind: "bytes"; data: Uint8Array; filename: string; contentType: string }
  | { kind: "output"; jobId: string; outputId: string };

type Plan = AnglePlan | MovePlan;

function planInputs(stage: Stage, plan: Plan): Record<string, unknown> {
  if (stage === "angle") {
    const p = plan as AnglePlan;
    return { prompt: p.prompt, seed: p.seed };
  }
  const p = plan as MovePlan;
  return {
    prompt: p.prompt,
    negative: p.negative,
    seed: p.seed,
    width: p.width,
    height: p.height,
    frames: p.frames,
    fps: p.fps,
    ...(p.cameraLora ? { cameraLora: p.cameraLora, cameraLoraStrength: 1 } : { cameraLoraStrength: 0 }),
  };
}

/** Apply plan values onto a copy of the stage graph. `image` is whatever the loader node should receive. */
export async function compile(stage: Stage, plan: Plan, image: unknown): Promise<Workflow> {
  const m = (await getManifest())[stage];
  const wf = new Workflow(structuredClone(await loadGraph(stage)));
  const values: Record<string, unknown> = { ...planInputs(stage, plan), image };
  for (const [name, value] of Object.entries(values)) {
    const bind = m.inputs[name];
    if (bind) wf.setInput(bind.node, bind.field, value);
  }
  return wf;
}

async function resolveImage(src: ImageSource) {
  const c = comfy();
  if (src.kind === "bytes") {
    return c.assets.fromBytes(src.data, { filename: src.filename, contentType: src.contentType });
  }
  const job = await c.jobs.get(src.jobId);
  const out = job.outputs.find((o) => o.id === src.outputId);
  if (!out) throw new Error("Source output not found on that job");
  return c.assets.fromBytes(await out.toBytes(), { filename: out.name, contentType: out.contentType });
}

export async function submit(stage: Stage, plan: Plan, image: ImageSource) {
  const asset = await resolveImage(image);
  const wf = await compile(stage, plan, asset);
  // One submit per user click: submit() mints a fresh idempotency key, so never retry it blindly.
  // No job metadata: SDK 0.5 types it as an object but comfy-api-proxy 0.1.6 rejects anything but a string.
  const job = await comfy().submit(wf);
  return { jobId: job.id, status: job.status };
}

export type JobView = {
  id: string;
  status: string;
  progress: number | null;
  message: string | null;
  queuePosition: number | null;
  outputs: { id: string; nodeId: string; name: string; contentType: string }[];
  error: string | null;
};

export async function jobView(jobId: string): Promise<JobView> {
  const job = await comfy().jobs.get(jobId);
  const p = job.progress;
  return {
    id: job.id,
    status: job.status,
    progress: p ? p.value : null,
    message: p?.currentNodeClass ?? p?.message ?? null,
    queuePosition: job.queuePosition,
    outputs: job.outputs.map((o) => ({ id: o.id, nodeId: o.nodeId, name: o.name, contentType: o.contentType })),
    error: job.error ? job.error.message : null,
  };
}

export async function outputFor(jobId: string, outputId: string) {
  const job = await comfy().jobs.get(jobId);
  return job.outputs.find((o) => o.id === outputId) ?? null;
}

export async function cancel(jobId: string) {
  const job = await comfy().jobs.get(jobId);
  await job.cancel();
  return job.status;
}

/** Pull ComfyUI's per-node validation errors (e.g. a missing model file) into one readable line. */
function summarizeDetails(details: Record<string, unknown> | null): string {
  if (!details) return "";
  const found: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (found.length >= 4 || depth > 6 || !v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o.message === "string" && typeof o.details === "string") found.push(`${o.message}: ${o.details}`);
    else for (const x of Object.values(o)) walk(x, depth + 1);
  };
  walk(details, 0);
  return found.length ? ` (${[...new Set(found)].join("; ")})` : "";
}

export function errorMessage(err: unknown): { message: string; status: number } {
  if (err instanceof ComfyError) {
    const status = err.httpStatus && err.httpStatus >= 400 ? err.httpStatus : 502;
    return { message: `${err.name}: ${err.message}${summarizeDetails(err.details)}`, status };
  }
  return { message: err instanceof Error ? err.message : "Unknown error", status: 500 };
}
