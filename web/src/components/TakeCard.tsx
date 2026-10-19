"use client";

import { Download, FileJson, RotateCcw, X } from "lucide-react";
import type { Take } from "@/lib/useTakes";

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STATUS: Record<Take["status"], string> = {
  queued: "In queue",
  running: "Generating",
  done: "",
  failed: "Failed",
  dryrun: "Dry run",
  canceled: "Canceled",
};

function IconButton({ label, onClick, href, children }: { label: string; onClick?: () => void; href?: string; children: React.ReactNode }) {
  const cls = "grid h-8 w-8 place-items-center rounded-[8px] bg-black/60 text-white backdrop-blur hover:bg-black/80";
  return href ? (
    <a href={href} download aria-label={label} title={label} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  );
}

export function TakeCard({
  take,
  aspect,
  onCancel,
  onRemove,
  onReuse,
}: {
  take: Take;
  aspect: number;
  onCancel: () => void;
  onRemove: () => void;
  onReuse: () => void;
}) {
  const busy = take.status === "queued" || take.status === "running";
  const stages = take.kind === "shot" ? 2 : 1;
  const stageIdx = take.stage === "move" ? 1 : 0;
  const pct = Math.round(((stageIdx + (take.progress ?? 0)) / stages) * 100);

  return (
    <article className="pop group relative overflow-hidden rounded-[16px] bg-panel" style={{ aspectRatio: aspect }}>
      {take.video ? (
        <video src={take.video} poster={take.still} className="h-full w-full object-cover" controls loop autoPlay muted playsInline />
      ) : take.still ? (
        // eslint-disable-next-line @next/next/no-img-element -- job outputs are signed/streamed URLs, not static assets
        <img src={take.still} alt={take.label} className="h-full w-full object-cover" />
      ) : take.status === "dryrun" ? (
        <div className="flex h-full flex-col justify-center gap-2 overflow-hidden p-4">
          <span className="caption">No GPU attached. Here is the exact ComfyUI workflow.</span>
          {take.dry?.prompts.map((p, i) => (
            <p key={i} className="line-clamp-3 font-mono text-[11px] leading-relaxed text-text/80">
              <span className="text-lime">{i === 0 ? "angle › " : "move › "}</span>
              {p}
            </p>
          ))}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {take.dry?.angle != null && (
              <button type="button" onClick={() => download("angle.api.json", take.dry!.angle)} className="flex h-8 items-center gap-1.5 rounded-[8px] bg-fill px-2.5 text-[12px] hover:bg-fill-2">
                <FileJson size={13} /> Angle workflow
              </button>
            )}
            {take.dry?.move != null && (
              <button type="button" onClick={() => download("move.api.json", take.dry!.move)} className="flex h-8 items-center gap-1.5 rounded-[8px] bg-fill px-2.5 text-[12px] hover:bg-fill-2">
                <FileJson size={13} /> Move workflow
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`h-full w-full ${busy ? "shimmer" : ""}`} />
      )}

      {busy && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-text/90">{take.message ?? STATUS[take.status]}</span>
            <span className="font-mono text-muted">{pct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>
      )}

      {take.error && <p className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-[12px] text-danger">{take.error}</p>}

      {STATUS[take.status] && !busy && (
        <span className="absolute left-2 top-2 rounded-[6px] bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur">{STATUS[take.status]}</span>
      )}

      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {take.video && (
          <IconButton label="Download video" href={take.video}>
            <Download size={15} />
          </IconButton>
        )}
        {take.still && !take.video && (
          <IconButton label="Download image" href={take.still}>
            <Download size={15} />
          </IconButton>
        )}
        <IconButton label="Reuse these settings" onClick={onReuse}>
          <RotateCcw size={15} />
        </IconButton>
        <IconButton label={busy ? "Cancel" : "Remove"} onClick={busy ? onCancel : onRemove}>
          <X size={15} />
        </IconButton>
      </div>

      {!busy && !take.error && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-6 text-[12px] text-white/85 opacity-0 transition-opacity group-hover:opacity-100">
          {take.label}
        </p>
      )}
    </article>
  );
}
