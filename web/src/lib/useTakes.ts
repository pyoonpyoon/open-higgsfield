"use client";

import { useCallback, useRef, useState } from "react";
import type { ShotSpec } from "./shot";

export type TakeKind = "still" | "shot";
export type TakeStatus = "queued" | "running" | "done" | "failed" | "dryrun" | "canceled";

export type Take = {
  id: string;
  kind: TakeKind;
  label: string;
  shot: ShotSpec;
  status: TakeStatus;
  stage: "angle" | "move";
  progress: number;
  message: string | null;
  still?: string;
  video?: string;
  error?: string;
  jobs: { angle?: string; move?: string };
  dry?: { angle?: unknown; move?: unknown; prompts: string[] };
  createdAt: number;
};

type JobView = {
  status: string;
  progress: number | null;
  message: string | null;
  queuePosition: number | null;
  outputs: { id: string; nodeId: string; contentType: string }[];
  error: string | null;
};

const POLL_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useTakes(accessCode: string) {
  const [takes, setTakes] = useState<Take[]>([]);
  const canceled = useRef(new Set<string>());

  const patch = useCallback((id: string, p: Partial<Take>) => {
    setTakes((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }, []);

  const headers = useCallback((): HeadersInit => (accessCode ? { "x-access-code": accessCode } : {}), [accessCode]);

  const post = useCallback(
    async (stage: "angle" | "move", shot: ShotSpec, source: { image?: Blob } | { jobId: string; outputId: string }) => {
      const fd = new FormData();
      fd.set("stage", stage);
      fd.set("shot", JSON.stringify(shot));
      if ("image" in source && source.image) fd.set("image", source.image, "subject.jpg");
      if ("jobId" in source) {
        fd.set("sourceJobId", source.jobId);
        fd.set("sourceOutputId", source.outputId);
      }
      const res = await fetch("/api/generate", { method: "POST", body: fd, headers: headers() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      return body as { mode: string; jobId?: string; workflow?: unknown; plan: { prompt: string } };
    },
    [headers],
  );

  const follow = useCallback(
    async (takeId: string, jobId: string, stage: "angle" | "move", want: "image" | "video") => {
      for (;;) {
        if (canceled.current.has(takeId)) {
          await fetch(`/api/jobs/${jobId}`, { method: "DELETE" }).catch(() => {});
          throw new Error("canceled");
        }
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const job = (await res.json()) as JobView & { error: string | null };
        if (!res.ok) throw new Error(job.error ?? "Lost track of the job");
        const queued = job.status === "queued";
        patch(takeId, {
          stage,
          status: queued ? "queued" : "running",
          progress: job.progress ?? 0,
          message: queued ? (job.queuePosition != null ? `In queue · #${job.queuePosition + 1}` : "In queue") : job.message,
        });
        if (job.status === "succeeded") {
          const out = job.outputs.find((o) => o.contentType.startsWith(`${want}/`)) ?? job.outputs[0];
          if (!out) throw new Error("Job finished without an output");
          return { outputId: out.id, url: `/api/jobs/${jobId}/outputs/${out.id}` };
        }
        if (["failed", "canceled", "canceling", "expired"].includes(job.status)) {
          throw new Error(job.error ?? `Job ${job.status}`);
        }
        await sleep(POLL_MS);
      }
    },
    [patch],
  );

  const roll = useCallback(
    async (kind: TakeKind, shot: ShotSpec, image: Blob, label: string) => {
      const id = crypto.randomUUID();
      const take: Take = { id, kind, label, shot, status: "queued", stage: "angle", progress: 0, message: "Sending to the set", jobs: {}, createdAt: Date.now() };
      setTakes((ts) => [take, ...ts]);
      try {
        const angle = await post("angle", shot, { image });
        if (angle.mode === "dryrun") {
          const prompts = [angle.plan.prompt];
          let move: unknown;
          if (kind === "shot") {
            const m = await post("move", shot, { jobId: "dryrun", outputId: "angle" });
            prompts.push(m.plan.prompt);
            move = m.workflow;
          }
          patch(id, { status: "dryrun", message: null, dry: { angle: angle.workflow, move, prompts } });
          return;
        }
        patch(id, { jobs: { angle: angle.jobId } });
        const still = await follow(id, angle.jobId!, "angle", "image");
        patch(id, { still: still.url, progress: 1 });
        if (kind === "still") {
          patch(id, { status: "done", message: null });
          return;
        }
        const move = await post("move", shot, { jobId: angle.jobId!, outputId: still.outputId });
        patch(id, { jobs: { angle: angle.jobId, move: move.jobId }, stage: "move", progress: 0 });
        const video = await follow(id, move.jobId!, "move", "video");
        patch(id, { video: video.url, status: "done", message: null, progress: 1 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        patch(id, msg === "canceled" ? { status: "canceled", message: null } : { status: "failed", error: msg, message: null });
      }
    },
    [follow, patch, post],
  );

  const cancelTake = useCallback((id: string) => {
    canceled.current.add(id);
  }, []);

  const remove = useCallback((id: string) => {
    canceled.current.add(id);
    setTakes((ts) => ts.filter((t) => t.id !== id));
  }, []);

  return { takes, roll, cancelTake, remove };
}

/** Downscale on the client so uploads stay small and fast (and under serverless body limits). */
export async function prepareImage(file: File, maxSide = 1536): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
}
