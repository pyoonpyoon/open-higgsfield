import "server-only";

// Protects a public deployment from draining the owner's Comfy credits.
// In-memory per instance: good enough to stop casual abuse, not a billing system.
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR ?? 30);
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function rateLimited(req: Request): boolean {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

/** Optional shared code (APP_ACCESS_CODE) for running real jobs on a public deploy. */
export function accessDenied(req: Request): boolean {
  const code = process.env.APP_ACCESS_CODE?.trim();
  return Boolean(code) && req.headers.get("x-access-code") !== code;
}

export const JOB_ID = /^[\w-]{1,128}$/;
// Output ids are opaque and surface-specific (comfy-api-proxy returns ~170-char signed tokens with dots).
export const OUTPUT_ID = /^[\w.=-]{1,1024}$/;

/** True for URLs a visitor's browser can reach (signed cloud URLs), false for loopback/private engine hosts. */
export function publicUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?$|.*\.local$)/.test(hostname);
  } catch {
    return false;
  }
}
