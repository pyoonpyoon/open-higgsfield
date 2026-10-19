"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A setting card in the composer row: thumbnail, tiny mono caption, value. */
export function SettingCard({
  caption,
  value,
  thumb,
  active,
  onClick,
}: {
  caption: string;
  value: string;
  thumb: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`flex h-12 min-w-[150px] flex-1 items-center gap-2.5 rounded-[12px] px-2 text-left transition-colors ${active ? "bg-fill-2" : "bg-fill hover:bg-fill-2"}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-panel-2">{thumb}</span>
      <span className="min-w-0">
        <span className="caption block">{caption}</span>
        <span className="block truncate text-[14px] leading-tight">{value}</span>
      </span>
    </button>
  );
}

/** Small rounded pill in the composer's bottom row. */
export function Pill({ children, onClick, title, active }: { children: React.ReactNode; onClick?: () => void; title?: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] transition-colors ${active ? "bg-fill-2" : "bg-fill hover:bg-fill-2"}`}
    >
      {children}
    </button>
  );
}

/** Chip grid used inside pickers. */
export function Choice<T extends string | number>({
  items,
  value,
  onChange,
  cols,
  label,
}: {
  items: { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  cols: number;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={String(it.id)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(it.id)}
            className={`flex min-h-9 flex-col items-center justify-center rounded-[8px] px-1.5 py-1 text-[13px] transition-colors ${on ? "bg-white text-lime-ink" : "bg-fill text-text hover:bg-fill-2"}`}
          >
            {it.label}
            {it.hint && <span className={`text-[10px] ${on ? "text-lime-ink/60" : "text-faint"}`}>{it.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Floating panel that closes on outside click / Escape. */
export function Popover({ open, onClose, children, className = "" }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const click = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (ref.current && t && !ref.current.contains(t) && !t.closest("[data-popover-anchor]")) onClose();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={`pop rounded-[16px] border border-line bg-panel p-3 shadow-[0_24px_80px_rgb(0_0_0/0.55)] ${className}`}>
      {children}
    </div>
  );
}

export function PanelTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <span className="text-[14px] font-semibold">{children}</span>
      {aside}
    </div>
  );
}

const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;
export const SAMPLE = { url: "/samples/marble-bust.jpg", name: "marble-bust.jpg", credit: "Marble bust of a youth · The Met · CC0" };

/** The subject photo: file for upload + object URL for the 3D previews. */
export function useSubject() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const pick = useCallback((f: File | undefined | null) => {
    if (!f || !IMAGE_TYPES.test(f.type)) return;
    setFile(f);
    setUrl(URL.createObjectURL(f));
  }, []);

  const loadSample = useCallback(async () => {
    const blob = await (await fetch(SAMPLE.url)).blob();
    pick(new File([blob], SAMPLE.name, { type: "image/jpeg" }));
  }, [pick]);

  const browse = useCallback(() => input.current?.click(), []);

  const inputEl = (
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
  );

  return { file, url, pick, loadSample, browse, inputEl };
}

/** Access code for public deployments with a real engine attached (kept per browser). */
export function useAccessCode() {
  const [code, setCode] = useState(() => {
    try {
      return typeof window === "undefined" ? "" : (localStorage.getItem("oh-access-code") ?? "");
    } catch {
      return "";
    }
  });
  const save = (v: string) => {
    setCode(v);
    try {
      localStorage.setItem("oh-access-code", v);
    } catch {}
  };
  return [code, save] as const;
}
