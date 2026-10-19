"use client";

import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp, Clock, Focus, Hand,
  ImageIcon, Plus, Ratio, RotateCcw, RotateCw, Sparkles, Square, Upload, Video, ZoomIn, ZoomOut,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ASPECTS, DURATIONS, GRADES, LENSES } from "@/lib/catalog";
import type { StudioConfig } from "@/lib/config";
import { DEFAULT_SHOT, randomSeed, type ShotSpec } from "@/lib/shot";
import { prepareImage, useTakes, type TakeKind } from "@/lib/useTakes";
import { nearest } from "../rig/geometry";
import { TakeCard } from "../TakeCard";
import { Choice, PanelTitle, Pill, Popover, SAMPLE, SettingCard, useAccessCode, useSubject } from "../ui";

const OrbitGizmo = dynamic(() => import("../rig/OrbitGizmo").then((m) => m.OrbitGizmo), { ssr: false });
const Viewfinder = dynamic(() => import("../rig/Viewfinder").then((m) => m.Viewfinder), { ssr: false });

type Picker = "subject" | "angle" | "lens" | "move" | "grade" | null;

const HERO = [
  { src: "/examples/right_low_wide.jpg", alt: "Low-angle wide re-shoot of a marble bust" },
  { src: "/examples/front-left_eye_medium.jpg", alt: "Front-left re-shoot of a marble bust" },
  { src: "/examples/front_high_close.jpg", alt: "High-angle close-up re-shoot of a marble bust" },
];

export function MoveIcon({ id, size = 16 }: { id: string; size?: number }) {
  const k = id.toLowerCase();
  const I =
    k.includes("zoom") ? Focus
    : k.includes("orbit") || k.includes("arc") ? (k.includes("left") ? RotateCcw : RotateCw)
    : k.includes("pan") ? (k.includes("left") ? ChevronsLeft : ChevronsRight)
    : k.includes("tilt") ? (k.includes("up") ? ChevronsUp : ChevronsDown)
    : k.endsWith("-in") || k.includes("push") ? ZoomIn
    : k.endsWith("-out") ? ZoomOut
    : k.includes("left") ? ArrowLeft
    : k.includes("right") ? ArrowRight
    : k.includes("up") ? ArrowUp
    : k.includes("down") ? ArrowDown
    : k.includes("hand") ? Hand
    : Square;
  return <I size={size} strokeWidth={2} aria-hidden />;
}

function Hero() {
  return (
    <div className="flex flex-col items-center px-4 pb-8 pt-8 text-center">
      <div className="relative mb-8 flex h-[230px] items-end justify-center md:h-[270px]" aria-hidden>
        {HERO.map((h, i) => {
          const center = i === 1;
          return (
            // eslint-disable-next-line @next/next/no-img-element -- small local hero images
            <img
              key={h.src}
              src={h.src}
              alt=""
              className={`rounded-[14px] object-cover shadow-[0_20px_60px_rgb(0_0_0/0.6)] ${
                center
                  ? "relative z-10 h-[230px] w-[172px] border-2 border-white/20 md:h-[270px] md:w-[202px]"
                  : `absolute bottom-3 h-[170px] w-[128px] opacity-70 md:h-[200px] md:w-[150px] ${i === 0 ? "-translate-x-[118px] -rotate-6 md:-translate-x-[150px]" : "translate-x-[118px] rotate-6 md:translate-x-[150px]"}`
              }`}
            />
          );
        })}
      </div>
      <h1 className="headline text-[34px] leading-[0.95] md:text-[52px]">Reshoot any shot</h1>
      <p className="mt-3 max-w-md text-[14px] text-muted">
        Move the camera anywhere around your subject, pick a lens and a move, and shoot it. Open weights, on ComfyUI.
      </p>
    </div>
  );
}

export function CinemaStudio({ config }: { config: StudioConfig }) {
  const { grammar, moves } = config;
  const [shot, setShot] = useState<ShotSpec>(() => ({
    ...DEFAULT_SHOT,
    move: moves.some((m) => m.id === DEFAULT_SHOT.move) ? DEFAULT_SHOT.move : moves[0].id,
  }));
  const [kind, setKind] = useState<TakeKind>("shot");
  const [picker, setPicker] = useState<Picker>(null);
  const [drag, setDrag] = useState<{ az: number; el: number } | null>(null);
  const [code, setCode] = useAccessCode();
  const subject = useSubject();
  const { takes, roll, cancelTake, remove } = useTakes(code);

  const set = <K extends keyof ShotSpec>(k: K, v: ShotSpec[K]) => setShot((s) => ({ ...s, [k]: v }));
  const az = grammar.azimuths.find((a) => a.id === shot.azimuth)!;
  const el = grammar.elevations.find((e) => e.id === shot.elevation)!;
  const dist = grammar.distances.find((d) => d.id === shot.distance)!;
  const lens = LENSES.find((l) => l.id === shot.lens)!;
  const grade = GRADES.find((g) => g.id === shot.grade)!;
  const move = moves.find((m) => m.id === shot.move)!;
  const aspect = ASPECTS.find((a) => a.id === shot.aspect)!;
  const elRange: [number, number] = [Math.min(...grammar.elevations.map((e) => e.deg)), Math.max(...grammar.elevations.map((e) => e.deg))];

  const label = useMemo(
    () => [az.label, el.label, dist.label, kind === "shot" ? move.label : null].filter(Boolean).join(" · "),
    [az, el, dist, move, kind],
  );

  const toggle = (p: Exclude<Picker, null>) => setPicker((cur) => (cur === p ? null : p));

  async function generate() {
    if (!subject.file) {
      setPicker("subject");
      return;
    }
    setPicker(null);
    const image = await prepareImage(subject.file);
    void roll(kind, { ...shot, seed: randomSeed() }, image, label);
  }

  const preview = (
    <Viewfinder
      imageUrl={subject.url}
      az={drag?.az ?? az.deg}
      el={drag?.el ?? el.deg}
      radius={dist.radius}
      fov={lens.fov * (aspect.w >= aspect.h ? aspect.h / aspect.w : 1)}
      moveId={kind === "still" || picker === "angle" ? "static" : move.id}
      duration={shot.duration}
      aspect={aspect.w / aspect.h}
      gradeCss={grade.css}
      playing={kind === "shot" && picker !== "angle"}
    />
  );

  const composer = (
      <div className="relative z-10 mx-auto w-full max-w-[900px]">
        <div className="relative mx-auto flex max-w-[900px] gap-2">
          <div role="radiogroup" aria-label="Output" className="hidden shrink-0 flex-col gap-1 rounded-[16px] bg-panel p-1 md:flex">
            {([
              ["still", "Image", ImageIcon],
              ["shot", "Video", Video],
            ] as const).map(([k, l, I]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`flex w-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] ${kind === k ? "bg-fill-2 text-text" : "text-muted hover:bg-fill"}`}
              >
                <I size={15} aria-hidden />
                {l}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 rounded-[20px] bg-panel p-2">
            {/* Picker popover */}
            <div className="absolute bottom-full left-0 right-0 z-20 mb-2 md:left-[70px]">
              <Popover open={picker === "subject"} onClose={() => setPicker(null)}>
                <PanelTitle>Subject</PanelTitle>
                <button
                  type="button"
                  onClick={subject.browse}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    subject.pick(e.dataTransfer.files[0]);
                  }}
                  className="flex w-full items-center gap-3 rounded-[12px] border border-dashed border-white/15 p-3 text-left hover:border-white/30"
                >
                  {subject.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL
                    <img src={subject.url} alt="Subject" className="h-16 w-16 rounded-[10px] object-cover" />
                  ) : (
                    <span className="grid h-16 w-16 place-items-center rounded-[10px] bg-fill text-muted">
                      <Upload size={18} />
                    </span>
                  )}
                  <span>
                    <span className="block text-[14px]">{subject.file ? subject.file.name : "Upload a photo"}</span>
                    <span className="block text-[12px] text-muted">PNG, JPEG or WebP. A person, product or place.</span>
                  </span>
                </button>
                <button type="button" onClick={subject.loadSample} className="mt-2 text-[12px] text-muted underline decoration-white/20 underline-offset-4 hover:text-text">
                  Or try the sample: {SAMPLE.credit}
                </button>
              </Popover>

              <Popover open={picker === "angle"} onClose={() => setPicker(null)}>
                <PanelTitle aside={<span className="caption">{grammar.azimuths.length * grammar.elevations.length * grammar.distances.length} positions</span>}>Camera angle</PanelTitle>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className="rounded-[12px] bg-fill">
                    <p className="pt-2 text-center text-[12px] text-faint">Hold and drag to move the camera</p>
                    <OrbitGizmo
                      className="h-[210px]"
                      az={drag?.az ?? az.deg}
                      el={drag?.el ?? el.deg}
                      imageUrl={subject.url}
                      elRange={elRange}
                      onDrag={setDrag}
                      onRelease={(v) => {
                        setDrag(null);
                        setShot((s) => ({ ...s, azimuth: nearest(grammar.azimuths, v.az, true).id, elevation: nearest(grammar.elevations, v.el).id }));
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {preview}
                    <Choice label="Shot size" cols={grammar.distances.length} items={grammar.distances} value={shot.distance} onChange={(v) => set("distance", v)} />
                    <Choice label="Height" cols={grammar.elevations.length} items={grammar.elevations} value={shot.elevation} onChange={(v) => set("elevation", v)} />
                  </div>
                </div>
              </Popover>

              <Popover open={picker === "lens"} onClose={() => setPicker(null)}>
                <PanelTitle>Lens</PanelTitle>
                <Choice label="Lens" cols={6} items={LENSES.map((l) => ({ id: l.id, label: l.label, hint: `${l.fov}°` }))} value={shot.lens} onChange={(v) => set("lens", v)} />
              </Popover>

              <Popover open={picker === "move"} onClose={() => setPicker(null)}>
                <PanelTitle aside={<span className="caption">LoRA = trained camera-control model</span>}>Camera movement</PanelTitle>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                  <div>{preview}</div>
                  <div role="radiogroup" aria-label="Camera movement" className="grid max-h-[260px] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
                    {moves.map((m) => {
                      const on = m.id === shot.move;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set("move", m.id)}
                          className={`flex h-11 items-center gap-2 rounded-[10px] px-2.5 text-left text-[13px] ${on ? "bg-white text-lime-ink" : "bg-fill hover:bg-fill-2"}`}
                        >
                          <MoveIcon id={m.id} />
                          <span className="flex-1 truncate">{m.label}</span>
                          {m.lora && <span className={`font-mono text-[9px] ${on ? "text-lime-ink/60" : "text-lime/80"}`}>LoRA</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Popover>

              <Popover open={picker === "grade"} onClose={() => setPicker(null)}>
                <PanelTitle>Color palette</PanelTitle>
                <div role="radiogroup" aria-label="Color palette" className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                  {GRADES.map((g) => {
                    const on = g.id === shot.grade;
                    return (
                      <button key={g.id} type="button" role="radio" aria-checked={on} onClick={() => set("grade", g.id)} className={`overflow-hidden rounded-[10px] text-left ${on ? "ring-2 ring-white" : "hover:ring-1 hover:ring-white/30"}`}>
                        {subject.url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local object URL
                          <img src={subject.url} alt="" className="aspect-square w-full object-cover" style={{ filter: g.css === "none" ? undefined : g.css }} />
                        ) : (
                          <span className="block aspect-square w-full" style={{ background: `linear-gradient(135deg, ${g.swatch[0]}, ${g.swatch[1]})` }} />
                        )}
                        <span className="block truncate bg-fill px-1.5 py-1 text-[11px]">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Popover>
            </div>

            {/* Setting cards */}
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto" data-popover-anchor>
              <SettingCard
                caption="Subject"
                value={subject.file ? "1 photo" : "Add"}
                active={picker === "subject"}
                onClick={() => toggle("subject")}
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                thumb={subject.url ? <img src={subject.url} alt="" className="h-full w-full object-cover" /> : <Plus size={16} className="text-muted" />}
              />
              <SettingCard caption="Camera angle" value={`${az.label} · ${el.label}`} active={picker === "angle"} onClick={() => toggle("angle")} thumb={<RotateCw size={15} className="text-[#7aa7ff]" />} />
              <SettingCard caption="Lens" value={lens.label} active={picker === "lens"} onClick={() => toggle("lens")} thumb={<Focus size={15} className="text-[#ffb36b]" />} />
              {kind === "shot" && (
                <SettingCard caption="Camera movement" value={move.label} active={picker === "move"} onClick={() => toggle("move")} thumb={<span className="text-[#c39bff]"><MoveIcon id={move.id} size={15} /></span>} />
              )}
              <SettingCard
                caption="Color palette"
                value={grade.label}
                active={picker === "grade"}
                onClick={() => toggle("grade")}
                thumb={<span className="h-full w-full" style={{ background: `linear-gradient(135deg, ${grade.swatch[0]}, ${grade.swatch[1]})` }} />}
              />
            </div>

            <div className="mt-2 flex gap-2">
              <div className="min-w-0 flex-1">
                <textarea
                  value={shot.action}
                  onChange={(e) => set("action", e.target.value.slice(0, 400))}
                  rows={2}
                  aria-label="Describe the action"
                  placeholder={kind === "shot" ? "Describe the action — e.g. she turns toward the light and smiles" : "Optional: anything the camera should see"}
                  className="w-full resize-none bg-transparent px-1.5 py-1 text-[14px] placeholder:text-faint focus:outline-none"
                />
                <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto" data-popover-anchor>
                  <div className="flex shrink-0 rounded-[8px] bg-fill p-0.5 md:hidden" role="radiogroup" aria-label="Output">
                    {(["still", "shot"] as const).map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`h-7 rounded-[6px] px-2 text-[12px] ${kind === k ? "bg-fill-2" : "text-muted"}`}>
                        {k === "still" ? "Image" : "Video"}
                      </button>
                    ))}
                  </div>
                  <Pill onClick={() => toggle("subject")} title="Add subject">
                    <Plus size={14} />
                  </Pill>
                  <Pill title="Models">
                    <Sparkles size={13} className="text-lime" />
                    {kind === "shot" ? "Qwen Edit + LTX-2" : "Qwen Image Edit"}
                  </Pill>
                  {kind === "shot" && (
                    <>
                      <Pill title="Aspect ratio" onClick={() => set("aspect", ASPECTS[(ASPECTS.findIndex((a) => a.id === shot.aspect) + 1) % ASPECTS.length].id)}>
                        <Ratio size={13} /> {shot.aspect}
                      </Pill>
                      <Pill title="Duration" onClick={() => set("duration", DURATIONS[(DURATIONS.indexOf(shot.duration as (typeof DURATIONS)[number]) + 1) % DURATIONS.length])}>
                        <Clock size={13} /> {shot.duration}s
                      </Pill>
                    </>
                  )}
                  {config.accessCode && config.mode !== "dryrun" && (
                    <input
                      aria-label="Access code"
                      suppressHydrationWarning
                      placeholder="Access code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="h-8 w-28 shrink-0 rounded-[8px] bg-fill px-2 text-[12px] placeholder:text-faint focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={generate}
                className="flex w-[118px] shrink-0 flex-col items-center justify-center rounded-[14px] bg-lime font-display text-[15px] font-bold uppercase tracking-wide text-lime-ink transition hover:brightness-105 active:brightness-95 md:w-[132px]"
              >
                Generate
                <span className="mt-0.5 font-sans text-[11px] font-medium normal-case tracking-normal text-lime-ink/60">
                  {config.mode === "dryrun" ? "dry run" : "open weights"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {takes.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-2 pb-6 md:px-6">
          <Hero />
          {composer}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="mx-auto max-w-[1100px] px-4 pb-6 pt-14 md:px-6">
              <h2 className="mb-3 text-[14px] font-semibold text-muted">Your takes</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {takes.map((t) => {
                  const a = ASPECTS.find((x) => x.id === t.shot.aspect)!;
                  return (
                    <TakeCard
                      key={t.id}
                      take={t}
                      aspect={t.kind === "shot" ? a.w / a.h : 3 / 4}
                      onCancel={() => cancelTake(t.id)}
                      onRemove={() => remove(t.id)}
                      onReuse={() => {
                        setShot(t.shot);
                        setKind(t.kind);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          </div>
          <div className="px-2 pb-3 pt-2 md:px-6 md:pb-5">{composer}</div>
        </>
      )}
      {subject.inputEl}
    </div>
  );
}
