"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Rotate3d, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { COVERAGE_PACKS } from "@/lib/catalog";
import type { StudioConfig } from "@/lib/config";
import { DEFAULT_SHOT, randomSeed, type ShotSpec } from "@/lib/shot";
import { prepareImage, useTakes } from "@/lib/useTakes";
import { nearest } from "../rig/geometry";
import { TakeCard } from "../TakeCard";
import { SAMPLE, useAccessCode, useSubject } from "../ui";

const OrbitGizmo = dynamic(() => import("../rig/OrbitGizmo").then((m) => m.OrbitGizmo), { ssr: false });

const BEST12 = COVERAGE_PACKS.find((p) => p.id === "best12")!;
// Zoom slider stops (0–10, like the reference UI) mapped onto the angle model's three shot sizes.
const ZOOM_STOPS = [
  { value: 0, distance: "wide" },
  { value: 5, distance: "medium" },
  { value: 10, distance: "close" },
];

function Slider({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="text-text">{display}</span>
      </span>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--pct" as string]: `${pct}%` }}
      />
    </label>
  );
}

export function AnglesApp({ config }: { config: StudioConfig }) {
  const { grammar } = config;
  const [shot, setShot] = useState<ShotSpec>({ ...DEFAULT_SHOT, azimuth: "front", elevation: "eye", distance: "medium" });
  const [drag, setDrag] = useState<{ az: number; el: number } | null>(null);
  const [batch, setBatch] = useState(false);
  const [code, setCode] = useAccessCode();
  const subject = useSubject();
  const { takes, roll, cancelTake, remove } = useTakes(code);

  const az = grammar.azimuths.find((a) => a.id === shot.azimuth)!;
  const el = grammar.elevations.find((e) => e.id === shot.elevation)!;
  const dist = grammar.distances.find((d) => d.id === shot.distance)!;
  const elDegs = grammar.elevations.map((e) => e.deg).sort((a, b) => a - b);
  const azStep = 360 / grammar.azimuths.length;
  const zoom = ZOOM_STOPS.find((z) => z.distance === shot.distance)?.value ?? 5;

  const setAngle = (azDeg: number, elDeg: number) =>
    setShot((s) => ({ ...s, azimuth: nearest(grammar.azimuths, ((azDeg % 360) + 360) % 360, true).id, elevation: nearest(grammar.elevations, elDeg).id }));

  const stepEl = (dir: 1 | -1) => {
    const i = elDegs.indexOf(el.deg) + dir;
    if (i >= 0 && i < elDegs.length) setAngle(az.deg, elDegs[i]);
  };

  const describe = (s: Pick<ShotSpec, "azimuth" | "elevation" | "distance">) =>
    [grammar.azimuths.find((x) => x.id === s.azimuth)?.label, grammar.elevations.find((x) => x.id === s.elevation)?.label, grammar.distances.find((x) => x.id === s.distance)?.label].join(" · ");

  async function generate() {
    if (!subject.file) {
      subject.browse();
      return;
    }
    const image = await prepareImage(subject.file);
    const shots = batch ? BEST12.shots : [{ azimuth: shot.azimuth, elevation: shot.elevation, distance: shot.distance }];
    for (const s of shots) {
      const spec = { ...shot, ...s, seed: randomSeed() };
      void roll("still", spec, image, describe(s));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Stage */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-4 md:px-6">
        <nav aria-label="Breadcrumb" className="text-[14px] text-muted md:pl-10">
          <Link href="/" className="hover:text-text">
            Apps
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text">Angles</span>
        </nav>

        {!subject.url ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <div
              className="w-full max-w-[380px] rounded-[16px] bg-panel p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                subject.pick(e.dataTransfer.files[0]);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small local example */}
              <img src="/examples/front-left_eye_medium.jpg" alt="Example: a marble bust re-shot from a new angle" className="aspect-[4/3] w-full rounded-[12px] object-cover object-top" />
              <h1 className="mt-5 text-center text-[28px] font-semibold uppercase tracking-tight">Angles</h1>
              <p className="mx-auto mt-2 max-w-[300px] text-center text-[16px] leading-snug text-muted">Re-shoot one photo from 96 camera positions around it</p>
              <button type="button" onClick={subject.browse} className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-[12px] bg-white text-[17px] font-semibold text-lime-ink hover:bg-white/90">
                <Upload size={18} /> Upload media
              </button>
              <button type="button" onClick={subject.loadSample} className="mt-3 w-full text-center text-[12px] text-muted underline decoration-white/20 underline-offset-4 hover:text-text">
                Or try the sample: {SAMPLE.credit}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1000px] pt-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <figure className="group relative overflow-hidden rounded-[16px] bg-panel" style={{ aspectRatio: 3 / 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                <img src={subject.url} alt="Your subject" className="h-full w-full object-cover" />
                <figcaption className="absolute left-2 top-2 rounded-[6px] bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur">Original</figcaption>
                <button type="button" onClick={subject.browse} className="absolute right-2 top-2 flex h-8 items-center gap-1.5 rounded-[8px] bg-black/60 px-2 text-[12px] text-white backdrop-blur hover:bg-black/80">
                  <RefreshCw size={13} /> Replace
                </button>
              </figure>
              {takes.map((t) => (
                <TakeCard
                  key={t.id}
                  take={t}
                  aspect={3 / 4}
                  onCancel={() => cancelTake(t.id)}
                  onRemove={() => remove(t.id)}
                  onReuse={() => setShot(t.shot)}
                />
              ))}
            </div>
            {takes.length === 0 && <p className="mt-4 text-center text-[13px] text-muted">Set the camera on the right, then Generate.</p>}
          </div>
        )}
      </section>

      {/* Control panel */}
      <aside className="w-full shrink-0 border-t border-line p-3 md:w-[360px] md:overflow-y-auto md:border-l md:border-t-0">
        <h2 className="flex items-center gap-2.5 px-1 pb-3 pt-1 text-[20px] font-semibold">
          <Rotate3d size={18} aria-hidden /> Angles
        </h2>

        <div className="rounded-[16px] bg-fill px-3 pb-3 pt-3">
          <p className="mx-auto max-w-[180px] text-center text-[12px] leading-snug text-faint">Hold and drag to change camera angle</p>
          <div className="relative mt-1">
            <button type="button" onClick={() => stepEl(1)} aria-label="Raise camera" className="absolute left-1/2 top-0 z-10 grid h-6 w-6 -translate-x-1/2 place-items-center text-faint hover:text-text">
              <ChevronUp size={16} />
            </button>
            <button type="button" onClick={() => setAngle(az.deg - azStep, el.deg)} aria-label="Rotate camera left" className="absolute left-0 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center text-faint hover:text-text">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => setAngle(az.deg + azStep, el.deg)} aria-label="Rotate camera right" className="absolute right-0 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center text-faint hover:text-text">
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={() => stepEl(-1)} aria-label="Lower camera" className="absolute bottom-0 left-1/2 z-10 grid h-6 w-6 -translate-x-1/2 place-items-center text-faint hover:text-text">
              <ChevronDown size={16} />
            </button>
            <OrbitGizmo
              className="mx-6 h-[230px]"
              az={drag?.az ?? az.deg}
              el={drag?.el ?? el.deg}
              imageUrl={subject.url}
              elRange={[elDegs[0], elDegs[elDegs.length - 1]]}
              onDrag={setDrag}
              onRelease={(v) => {
                setDrag(null);
                setAngle(v.az, v.el);
              }}
            />
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 text-[12px] text-muted">
            <input type="checkbox" checked={batch} onChange={(e) => setBatch(e.target.checked)} className="h-4 w-4 rounded-[5px] accent-[#d1fe17]" />
            Generate from 12 best angles
          </label>
        </div>

        <div className={`mt-3 space-y-0.5 px-1 ${batch ? "pointer-events-none opacity-40" : ""}`} aria-disabled={batch}>
          <Slider label="Rotation" value={az.deg} display={`${az.deg}°`} min={0} max={360 - azStep} step={azStep} onChange={(v) => setAngle(v, el.deg)} />
          <Slider label="Tilt" value={el.deg} display={`${el.deg}°`} min={elDegs[0]} max={elDegs[elDegs.length - 1]} step={elDegs[1] - elDegs[0]} onChange={(v) => setAngle(az.deg, v)} />
          <Slider
            label="Zoom"
            value={zoom}
            display={`${zoom} · ${dist.label}`}
            min={0}
            max={10}
            step={5}
            onChange={(v) => setShot((s) => ({ ...s, distance: ZOOM_STOPS.find((z) => z.value === v)?.distance ?? s.distance }))}
          />
        </div>

        {config.accessCode && config.mode !== "dryrun" && (
          <input
            aria-label="Access code"
            suppressHydrationWarning
            placeholder="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-3 h-10 w-full rounded-[10px] bg-fill px-3 text-[13px] placeholder:text-faint focus:outline-none"
          />
        )}

        <button
          type="button"
          onClick={generate}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-lime text-[16px] font-semibold text-lime-ink transition hover:brightness-105 active:brightness-95"
        >
          {subject.file ? "Generate" : "Upload a photo"}
          {subject.file && <span className="text-lime-ink/60">{batch ? "×12" : config.mode === "dryrun" ? "· dry run" : ""}</span>}
        </button>
        <p className="mt-2 text-center text-[11px] text-faint">{batch ? "12 stills" : `${az.label} · ${el.label} · ${dist.label}`}</p>
      </aside>
      {subject.inputEl}
    </div>
  );
}
