"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ASPECTS, COVERAGE_PACKS, DURATIONS, GRADES, LENSES, type AngleGrammar, type CameraMove } from "@/lib/catalog";
import { DEFAULT_SHOT, randomSeed, type ShotSpec } from "@/lib/shot";
import { prepareImage, useTakes, type TakeKind } from "@/lib/useTakes";
import { TakeCard } from "./TakeCard";

const SetView = dynamic(() => import("./rig/SetView").then((m) => m.SetView), { ssr: false });
const Viewfinder = dynamic(() => import("./rig/Viewfinder").then((m) => m.Viewfinder), { ssr: false });

export type StudioConfig = {
  mode: "cloud" | "local" | "dryrun";
  accessCode: boolean;
  grammar: AngleGrammar;
  moves: CameraMove[];
};

type Output = TakeKind | "coverage";

const MODE_CHIP = {
  cloud: { label: "Comfy Cloud", cls: "border-ok/50 text-ok" },
  local: { label: "Local ComfyUI", cls: "border-ok/50 text-ok" },
  dryrun: { label: "Dry run · no engine", cls: "border-amber/50 text-amber" },
} as const;

function Section({ n, title, children, aside }: { n: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="flex items-baseline gap-2">
          <span className="readout text-[11px] text-amber">{n}</span>
          <span className="font-display text-[17px] font-semibold uppercase tracking-[0.06em]">{title}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Seg<T extends string | number>({ items, value, onChange, cols, label }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; cols: number; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <button key={String(it.id)} type="button" className="chip" aria-pressed={it.id === value} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

function MoveGlyph({ id }: { id: string }) {
  const k = id.toLowerCase();
  const path = k.includes("orbit") || k.includes("arc")
    ? k.includes("left") ? "M17 7a7 7 0 1 0 2 6M17 7V3m0 4h-4" : "M7 7a7 7 0 1 1-2 6M7 7V3m0 4h4"
    : k.includes("out") ? "M12 5v14M8 9l4-4 4 4M4 21h16"
    : k.includes("in") || k.includes("push") ? "M12 19V5M8 15l4 4 4-4M4 3h16"
    : k.includes("left") ? "M19 12H5m4-4-4 4 4 4"
    : k.includes("right") ? "M5 12h14m-4-4 4 4-4 4"
    : k.includes("up") ? "M12 19V5m-4 4 4-4 4 4"
    : k.includes("down") ? "M12 5v14m-4-4 4 4 4-4"
    : k.includes("hand") ? "M3 12c2-3 4 3 6 0s4 3 6 0 4 3 6 0"
    : "M6 6h12v12H6z";
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

export function Studio({ config }: { config: StudioConfig }) {
  const { grammar, moves } = config;
  const [shot, setShot] = useState<ShotSpec>(() => ({
    ...DEFAULT_SHOT,
    move: moves.some((m) => m.id === DEFAULT_SHOT.move) ? DEFAULT_SHOT.move : moves[0].id,
  }));
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [output, setOutput] = useState<Output>("shot");
  const [pack, setPack] = useState(COVERAGE_PACKS[0].id);
  const [playing, setPlaying] = useState(true);
  const [code, setCode] = useState(() => {
    try {
      return typeof window === "undefined" ? "" : (localStorage.getItem("oh-access-code") ?? "");
    } catch {
      return "";
    }
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { takes, roll, cancelTake, remove } = useTakes(code);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const set = <K extends keyof ShotSpec>(k: K, v: ShotSpec[K]) => setShot((s) => ({ ...s, [k]: v }));

  const az = grammar.azimuths.find((a) => a.id === shot.azimuth)!;
  const el = grammar.elevations.find((e) => e.id === shot.elevation)!;
  const dist = grammar.distances.find((d) => d.id === shot.distance)!;
  const lens = LENSES.find((l) => l.id === shot.lens)!;
  const grade = GRADES.find((g) => g.id === shot.grade)!;
  const move = moves.find((m) => m.id === shot.move)!;
  const aspect = ASPECTS.find((a) => a.id === shot.aspect)!;

  const describe = (s: ShotSpec) => {
    const a = grammar.azimuths.find((x) => x.id === s.azimuth)?.label;
    const e = grammar.elevations.find((x) => x.id === s.elevation)?.label;
    const d = grammar.distances.find((x) => x.id === s.distance)?.label;
    const m = moves.find((x) => x.id === s.move)?.label;
    return [a, e, d, output === "still" ? null : m].filter(Boolean).join(" · ");
  };

  const rollLabel = useMemo(() => (output === "coverage" ? `Roll coverage ×${COVERAGE_PACKS.find((p) => p.id === pack)!.shots.length}` : output === "still" ? "Roll still" : "Roll shot"), [output, pack]);

  async function onRoll() {
    if (!file) {
      fileInput.current?.click();
      return;
    }
    const image = await prepareImage(file);
    if (output === "coverage") {
      for (const s of COVERAGE_PACKS.find((p) => p.id === pack)!.shots) {
        const spec = { ...shot, ...s, seed: randomSeed() };
        void roll("still", spec, image, describe(spec));
      }
    } else {
      // Fresh seed per take; the take keeps it so a print can be reproduced.
      void roll(output, { ...shot, seed: randomSeed() }, image, describe(shot));
    }
  }

  async function loadSample() {
    const blob = await (await fetch("/samples/marble-bust.jpg")).blob();
    pickFile(new File([blob], "marble-bust.jpg", { type: "image/jpeg" }));
  }

  function pickFile(f: File | undefined) {
    if (!f || !/^image\/(png|jpe?g|webp)$/.test(f.type)) return;
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
  }

  const chip = MODE_CHIP[config.mode];

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[28px] font-extrabold uppercase leading-none tracking-[0.04em]">
            Open<span className="text-amber">/</span>Higgsfield
          </h1>
          <span className="label hidden sm:inline">Reshoot · virtual set</span>
        </div>
        <div className="flex items-center gap-2">
          {config.accessCode && config.mode !== "dryrun" && (
            <input
              aria-label="Access code"
              suppressHydrationWarning
              placeholder="Access code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                try {
                  localStorage.setItem("oh-access-code", e.target.value);
                } catch {}
              }}
              className="readout h-8 w-32 rounded-[2px] border border-line-2 bg-panel-2 px-2 text-xs"
            />
          )}
          <span className={`readout rounded-[2px] border px-2 py-1 text-[11px] uppercase tracking-wider ${chip.cls}`}>{chip.label}</span>
          <a className="btn" href="https://github.com/pyoonpyoon/open-higgsfield" target="_blank" rel="noreferrer">
            Source
          </a>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* The set */}
          <div className="relative h-[46vh] min-h-[320px] overflow-hidden rounded-[3px] border border-line bg-[#101214]">
            <SetView grammar={grammar} value={{ azimuth: shot.azimuth, elevation: shot.elevation, distance: shot.distance }} onChange={(v) => setShot((s) => ({ ...s, ...v }))} imageUrl={imageUrl} />
            <div className="pointer-events-none absolute left-3 top-3">
              <div className="font-display text-sm font-semibold uppercase tracking-[0.12em]">The set</div>
              <div className="label mt-0.5">Drag the camera · click a mark · orbit to look around</div>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 readout text-[11px] text-dim">
              {grammar.azimuths.length * grammar.elevations.length * grammar.distances.length} camera positions
            </div>
          </div>

          {/* The monitor */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-[3px] border border-line bg-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">Monitor · {output === "still" ? "frame" : `${move.label} preview`}</span>
                <button className="btn" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
                  {playing ? "Pause" : "Play"}
                </button>
              </div>
              <div className="mx-auto" style={{ maxWidth: aspect.w >= aspect.h ? "100%" : "300px" }}>
                <Viewfinder
                  imageUrl={imageUrl}
                  az={az.deg}
                  el={el.deg}
                  radius={dist.radius}
                  fov={lens.fov * (aspect.w >= aspect.h ? aspect.h / aspect.w : 1)}
                  moveId={output === "still" ? "static" : move.id}
                  duration={shot.duration}
                  aspect={aspect.w / aspect.h}
                  gradeCss={grade.css}
                  playing={playing && output !== "still"}
                />
              </div>
              <p className="label mt-2 normal-case tracking-normal">
                A blocking preview of framing and movement. The models render the real thing.
              </p>
            </div>
            <dl className="grid grid-cols-2 content-start gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-1">
              {[
                ["Angle", az.label],
                ["Height", el.label],
                ["Size", dist.label],
                ["Lens", lens.label],
                ["Move", output === "still" ? "—" : move.label],
                ["Grade", grade.label],
              ].map(([k, v]) => (
                <div key={k} className="bg-panel px-3 py-2">
                  <dt className="label">{k}</dt>
                  <dd className="readout mt-0.5 text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Director's panel */}
        <aside className="rounded-[3px] border border-line bg-panel lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
          <Section n="01" title="Subject">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              className={`flex w-full items-center gap-3 rounded-[2px] border border-dashed p-3 text-left transition-colors ${dragOver ? "border-amber bg-amber/10" : "border-line-2 hover:border-dim"}`}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={imageUrl} alt="Subject" className="h-14 w-14 rounded-[2px] object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-[2px] bg-panel-2 text-2xl text-dim">+</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm">{file ? file.name : "Drop a photo or click to upload"}</span>
                <span className="label mt-1 block normal-case tracking-normal">PNG, JPEG or WebP · a person, product or place</span>
              </span>
            </button>
            {!file && (
              <button type="button" className="label mt-2 underline decoration-dotted underline-offset-4 hover:text-text" onClick={loadSample}>
                Or try the sample: a marble bust (The Met, CC0)
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          </Section>

          <Section n="02" title="Camera position">
            <div className="space-y-3">
              <Seg label="Azimuth" cols={4} items={grammar.azimuths} value={shot.azimuth} onChange={(v) => set("azimuth", v)} />
              <Seg label="Elevation" cols={grammar.elevations.length} items={grammar.elevations} value={shot.elevation} onChange={(v) => set("elevation", v)} />
              <Seg label="Shot size" cols={grammar.distances.length} items={grammar.distances} value={shot.distance} onChange={(v) => set("distance", v)} />
            </div>
          </Section>

          <Section n="03" title="Lens">
            <Seg label="Lens" cols={6} items={LENSES} value={shot.lens} onChange={(v) => set("lens", v)} />
          </Section>

          {output !== "still" && output !== "coverage" && (
            <Section n="04" title="Camera move">
              <div role="group" aria-label="Camera move" className="grid grid-cols-2 gap-1.5">
                {moves.map((m) => (
                  <button key={m.id} type="button" className="chip flex items-center gap-2 px-2 text-left" aria-pressed={m.id === shot.move} onClick={() => set("move", m.id)}>
                    <MoveGlyph id={m.id} />
                    <span className="truncate">{m.label}</span>
                    {m.lora && <span className="ml-auto text-[9px] text-dim" title="Uses a camera-control LoRA">LoRA</span>}
                  </button>
                ))}
              </div>
            </Section>
          )}

          <Section n="05" title="Grade">
            <div role="group" aria-label="Color grade" className="grid grid-cols-4 gap-1.5">
              {GRADES.map((g) => (
                <button key={g.id} type="button" className="chip flex flex-col items-start gap-1.5 px-2" aria-pressed={g.id === shot.grade} onClick={() => set("grade", g.id)}>
                  <span className="h-2 w-full rounded-[1px]" style={{ background: `linear-gradient(90deg, ${g.swatch[0]}, ${g.swatch[1]})` }} />
                  <span className="truncate text-[10.5px]">{g.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section n="06" title="Action">
            <textarea
              value={shot.action}
              onChange={(e) => set("action", e.target.value.slice(0, 400))}
              rows={2}
              placeholder="What happens in the shot? e.g. she turns toward the light and smiles"
              className="w-full resize-none rounded-[2px] border border-line bg-panel-2 p-2.5 text-sm placeholder:text-dim/70"
            />
            {output === "shot" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="label mb-1.5">Aspect</div>
                  <Seg label="Aspect" cols={2} items={ASPECTS.map((a) => ({ id: a.id, label: a.id }))} value={shot.aspect} onChange={(v) => set("aspect", v)} />
                </div>
                <div>
                  <div className="label mb-1.5">Seconds</div>
                  <Seg label="Duration" cols={3} items={DURATIONS.map((d) => ({ id: d, label: `${d}s` }))} value={shot.duration as (typeof DURATIONS)[number]} onChange={(v) => set("duration", v)} />
                </div>
              </div>
            )}
          </Section>

          <div className="sticky bottom-0 border-t border-line bg-panel p-4">
            <Seg
              label="Output"
              cols={3}
              items={[
                { id: "still", label: "Still" },
                { id: "shot", label: "Shot" },
                { id: "coverage", label: "Coverage" },
              ]}
              value={output}
              onChange={(v) => setOutput(v as Output)}
            />
            {output === "coverage" && (
              <select value={pack} onChange={(e) => setPack(e.target.value)} aria-label="Coverage pack" className="readout mt-2 h-9 w-full rounded-[2px] border border-line-2 bg-panel-2 px-2 text-xs">
                {COVERAGE_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} · {p.shots.length} angles
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onRoll}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-[2px] bg-tally font-display text-xl font-extrabold uppercase tracking-[0.12em] text-white transition-[filter] hover:brightness-110 active:brightness-95"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-white" />
              {file ? rollLabel : "Add a subject"}
            </button>
            {config.mode === "dryrun" && (
              <p className="label mt-2 normal-case tracking-normal">
                No engine connected: rolling compiles the exact ComfyUI workflows for you to download.
              </p>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-[0.06em]">Takes</h2>
          <span className="label">{takes.length} on the reel</span>
        </div>
        {takes.length === 0 ? (
          <p className="readout py-10 text-center text-sm text-dim">Nothing rolled yet. Frame a shot and hit Roll.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {takes.map((t, i) => (
              <TakeCard
                key={t.id}
                take={t}
                n={takes.length - i}
                onCancel={() => cancelTake(t.id)}
                onRemove={() => remove(t.id)}
                onReuse={() => {
                  setShot(t.shot);
                  setOutput(t.kind);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
