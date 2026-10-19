import "server-only";
import type { StudioConfig } from "./config";
import { engineMode } from "./engine";
import { getManifest } from "./manifest";

export async function studioConfig(): Promise<StudioConfig> {
  const m = await getManifest();
  return {
    mode: engineMode(),
    accessCode: Boolean(process.env.APP_ACCESS_CODE?.trim()),
    grammar: m.angleGrammar,
    moves: m.cameraMoves,
  };
}
