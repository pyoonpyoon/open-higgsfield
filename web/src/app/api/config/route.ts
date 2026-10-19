import { studioConfig } from "@/lib/studioConfig";

export async function GET() {
  return Response.json(await studioConfig());
}
