import { errorMessage, outputFor } from "@/lib/engine";
import { JOB_ID, OUTPUT_ID, publicUrl } from "@/lib/guard";

// Prefer handing the browser a short-lived signed URL (Comfy Cloud). A local engine's URL
// (comfy-api-proxy on 127.0.0.1) is only reachable from this server, so stream those bytes.
export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]/outputs/[outputId]">) {
  const { id, outputId } = await ctx.params;
  if (!JOB_ID.test(id) || !OUTPUT_ID.test(outputId)) return Response.json({ error: "Bad id" }, { status: 400 });
  try {
    const out = await outputFor(id, outputId);
    if (!out) return Response.json({ error: "Output not found" }, { status: 404 });
    try {
      const { url } = await out.getDownloadUrl();
      if (publicUrl(url)) return Response.redirect(url, 302);
    } catch {
      // fall through to streaming
    }
    const bytes = await out.toBytes();
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": out.contentType,
        "content-disposition": `inline; filename="${out.name.replace(/"/g, "")}"`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const { message, status } = errorMessage(err);
    return Response.json({ error: message }, { status });
  }
}
