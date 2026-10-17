"use client";

import type { Take } from "@/lib/useTakes";

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STATUS: Record<Take["status"], { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "text-amber" },
  running: { label: "Rolling", cls: "text-tally" },
  done: { label: "Print", cls: "text-ok" },
  failed: { label: "NG", cls: "text-tally" },
  dryrun: { label: "Dry run", cls: "text-amber" },
  canceled: { label: "Cut", cls: "text-dim" },
};

export function TakeCard({ take, n, onCancel, onRemove, onReuse }: { take: Take; n: number; onCancel: () => void; onRemove: () => void; onReuse: () => void }) {
  const s = STATUS[take.status];
  const busy = take.status === "queued" || take.status === "running";
  const stages: Take["stage"][] = take.kind === "shot" ? ["angle", "move"] : ["angle"];

  return (
    <article className="rise flex flex-col overflow-hidden rounded-[3px] border border-line bg-panel">
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <div className="font-display text-lg leading-none tracking-wide">TAKE {String(n).padStart(2, "0")}</div>
          <div className="label mt-1 truncate">{take.label}</div>
        </div>
        <span className={`readout flex items-center gap-1.5 text-[11px] uppercase ${s.cls}`}>
          {take.status === "running" && <span className="rec-blink inline-block h-1.5 w-1.5 rounded-full bg-tally" />}
          {s.label}
        </span>
      </header>

      <div className="relative aspect-video bg-black">
        {take.video ? (
          <video src={take.video} poster={take.still} className="h-full w-full object-contain" controls loop autoPlay muted playsInline />
        ) : take.still ? (
          // eslint-disable-next-line @next/next/no-img-element -- job outputs are signed/streamed URLs, not static assets
          <img src={take.still} alt={`Take ${n}, new angle`} className="h-full w-full object-contain" />
        ) : take.status === "dryrun" ? (
          <div className="flex h-full flex-col justify-center gap-2 p-4">
            <p className="label text-amber">No engine connected</p>
            {take.dry?.prompts.map((p, i) => (
              <p key={i} className="readout line-clamp-3 text-[11.5px] leading-relaxed text-text/85">
                <span className="text-dim">{i === 0 ? "ANGLE ▸ " : "MOVE ▸ "}</span>
                {p}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="readout text-xs text-dim">{take.error ? "" : (take.message ?? "…")}</span>
          </div>
        )}
        {take.error && <p className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-xs text-tally">{take.error}</p>}
      </div>

      {busy && (
        <div className="flex gap-1 px-3 pt-3">
          {stages.map((st) => {
            const idx = stages.indexOf(st);
            const cur = stages.indexOf(take.stage);
            const pct = idx < cur ? 100 : idx === cur ? Math.round(take.progress * 100) : 0;
            return (
              <div key={st} className="flex-1">
                <div className="label mb-1 flex justify-between">
                  <span>{st}</span>
                  <span className="readout">{pct}%</span>
                </div>
                <div className="h-1 bg-line">
                  <div className="h-full bg-amber transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {busy && take.message && <p className="readout px-3 pt-2 text-[11px] text-dim">{take.message}</p>}

      <footer className="mt-auto flex flex-wrap gap-2 p-3">
        {take.dry?.angle != null && (
          <button className="btn" onClick={() => download(`angle-take${n}.api.json`, take.dry!.angle)}>
            Angle workflow ↓
          </button>
        )}
        {take.dry?.move != null && (
          <button className="btn" onClick={() => download(`move-take${n}.api.json`, take.dry!.move)}>
            Move workflow ↓
          </button>
        )}
        {take.video && (
          <a className="btn" href={take.video} download={`take${n}.mp4`}>
            Video ↓
          </a>
        )}
        {take.still && !take.video && (
          <a className="btn" href={take.still} download={`take${n}.png`}>
            Still ↓
          </a>
        )}
        <button className="btn" onClick={onReuse}>
          Reuse setup
        </button>
        {busy ? (
          <button className="btn ml-auto text-tally" onClick={onCancel}>
            Cut
          </button>
        ) : (
          <button className="btn ml-auto" onClick={onRemove} aria-label={`Remove take ${n}`}>
            ✕
          </button>
        )}
      </footer>
    </article>
  );
}
