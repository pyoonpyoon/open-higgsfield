import type { AngleGrammar, CameraMove } from "./catalog";

/**
 * cloud  — COMFY_API_KEY set: Comfy Cloud, or a serverless deployment when COMFY_BASE_URL is also set
 * local  — only COMFY_BASE_URL set: self-hosted ComfyUI behind comfy-api-proxy (no key)
 * dryrun — neither: compile the exact workflow and hand it back instead of running it
 */
export type EngineMode = "cloud" | "local" | "dryrun";

/** Everything the client needs to render the apps; built on the server from env + manifest. */
export type StudioConfig = {
  mode: EngineMode;
  accessCode: boolean;
  grammar: AngleGrammar;
  moves: CameraMove[];
};
