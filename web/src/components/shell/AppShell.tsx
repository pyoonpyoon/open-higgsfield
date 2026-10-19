"use client";

import { Aperture, ChevronsUpDown, Clapperboard, Code2, PanelLeft, Rotate3d, Cpu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { EngineMode } from "@/lib/config";

const APPS = [
  { href: "/", label: "Cinema Studio", Icon: Clapperboard, grad: "from-[#ff8a3d] to-[#ff3d6e]" },
  { href: "/angles", label: "Angles", Icon: Rotate3d, grad: "from-[#3d8bff] to-[#7a4dff]" },
] as const;

const ENGINE_LABEL: Record<EngineMode, string> = {
  cloud: "Comfy Cloud",
  local: "Local ComfyUI",
  dryrun: "Dry run · no GPU attached",
};

export const REPO_URL = "https://github.com/pyoonpyoon/open-higgsfield";

/** Our own mark: a lime tile with an aperture. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[8px] bg-lime text-lime-ink" style={{ width: size, height: size }}>
      <Aperture size={size * 0.62} strokeWidth={2.2} aria-hidden />
    </span>
  );
}

function NavIcon({ Icon, grad }: { Icon: (typeof APPS)[number]["Icon"]; grad: string }) {
  return (
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-gradient-to-br ${grad} shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]`}>
      <Icon size={14} strokeWidth={2.2} className="text-white" aria-hidden />
    </span>
  );
}

export function AppShell({ mode, children }: { mode: EngineMode; children: React.ReactNode }) {
  const path = usePathname();
  const current = APPS.find((a) => (a.href === "/" ? path === "/" : path.startsWith(a.href))) ?? APPS[0];
  const [switcher, setSwitcher] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-full flex-col gap-1.5 p-1.5 md:h-screen md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between rounded-[16px] bg-sunk px-3 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <Mark size={26} />
          <span className="text-[15px] font-semibold">Open Higgsfield</span>
        </div>
        <nav className="flex gap-1" aria-label="Apps">
          {APPS.map((a) => (
            <Link key={a.href} href={a.href} className={`rounded-[8px] px-2.5 py-1.5 text-[13px] ${a === current ? "bg-fill-2 text-text" : "text-muted"}`}>
              {a.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Desktop sidebar */}
      {!collapsed && (
        <aside className="hidden w-[232px] shrink-0 flex-col rounded-[16px] bg-sunk p-3 md:flex">
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSwitcher((s) => !s)}
              aria-expanded={switcher}
              className="flex h-[38px] flex-1 items-center gap-2 rounded-[10px] bg-fill px-2 text-left hover:bg-fill-2"
            >
              <Mark size={24} />
              <span className="flex-1 truncate text-[14px] font-semibold">{current.label}</span>
              <ChevronsUpDown size={14} className="text-muted" aria-hidden />
            </button>
            <button type="button" onClick={() => setCollapsed(true)} className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-fill text-muted hover:bg-fill-2" aria-label="Collapse sidebar">
              <PanelLeft size={16} />
            </button>
            {switcher && (
              <div className="pop absolute left-0 right-0 top-[44px] z-30 rounded-[12px] border border-line bg-panel p-1 shadow-2xl">
                {APPS.map((a) => (
                  <Link key={a.href} href={a.href} onClick={() => setSwitcher(false)} className="flex items-center gap-2.5 rounded-[8px] px-2 py-2 hover:bg-fill">
                    <NavIcon Icon={a.Icon} grad={a.grad} />
                    <span className="text-[14px]">{a.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <nav className="mt-4 flex flex-col gap-0.5" aria-label="Apps">
            {APPS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                aria-current={a === current ? "page" : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-[10px] px-1.5 text-[14px] ${a === current ? "bg-fill-2 text-text" : "text-text/90 hover:bg-fill"}`}
              >
                <NavIcon Icon={a.Icon} grad={a.grad} />
                {a.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2">
            <div className="rounded-[12px] border border-line bg-panel p-3">
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <Cpu size={13} aria-hidden /> Powered by ComfyUI
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-text">Open-weight models: Qwen-Image-Edit and LTX-2, run through the Comfy Developer Platform.</p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[12px]">
                <span className={`h-1.5 w-1.5 rounded-full ${mode === "dryrun" ? "bg-[#ffb000]" : "bg-ok"}`} />
                <span className="text-muted">{ENGINE_LABEL[mode]}</span>
              </div>
            </div>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-[10px] bg-lime px-3 text-[14px] font-semibold text-lime-ink hover:brightness-105">
              <Code2 size={16} aria-hidden /> Source on GitHub
            </a>
          </div>
        </aside>
      )}

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-[16px] border border-line bg-page">
        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} className="absolute left-3 top-3 z-20 hidden h-9 w-9 place-items-center rounded-[10px] bg-fill text-muted hover:bg-fill-2 md:grid" aria-label="Expand sidebar">
            <PanelLeft size={16} />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
