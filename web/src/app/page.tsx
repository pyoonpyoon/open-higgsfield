import { CinemaStudio } from "@/components/cinema/CinemaStudio";
import { AppShell } from "@/components/shell/AppShell";
import { studioConfig } from "@/lib/studioConfig";

export default async function Page() {
  const config = await studioConfig();
  return (
    <AppShell mode={config.mode}>
      <CinemaStudio config={config} />
    </AppShell>
  );
}
