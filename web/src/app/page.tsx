import { Studio } from "@/components/Studio";
import { engineMode } from "@/lib/engine";
import { getManifest } from "@/lib/manifest";

export default async function Page() {
  const m = await getManifest();
  return (
    <Studio
      config={{
        mode: engineMode(),
        accessCode: Boolean(process.env.APP_ACCESS_CODE?.trim()),
        grammar: m.angleGrammar,
        moves: m.cameraMoves,
      }}
    />
  );
}
