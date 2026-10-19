import type { Metadata } from "next";
import { AnglesApp } from "@/components/angles/AnglesApp";
import { AppShell } from "@/components/shell/AppShell";
import { studioConfig } from "@/lib/studioConfig";

export const metadata: Metadata = { title: "Angles — Open Higgsfield" };

export default async function Page() {
  const config = await studioConfig();
  return (
    <AppShell mode={config.mode}>
      <AnglesApp config={config} />
    </AppShell>
  );
}
