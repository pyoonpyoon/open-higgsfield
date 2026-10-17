import { engineMode } from "@/lib/engine";
import { getManifest } from "@/lib/manifest";

export async function GET() {
  const m = await getManifest();
  return Response.json({
    mode: engineMode(),
    accessCode: Boolean(process.env.APP_ACCESS_CODE?.trim()),
    grammar: m.angleGrammar,
    moves: m.cameraMoves,
  });
}
