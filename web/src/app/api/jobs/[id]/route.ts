import { cancel, errorMessage, jobView } from "@/lib/engine";
import { JOB_ID } from "@/lib/guard";

export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  if (!JOB_ID.test(id)) return Response.json({ error: "Bad job id" }, { status: 400 });
  try {
    return Response.json(await jobView(id), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const { message, status } = errorMessage(err);
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  if (!JOB_ID.test(id)) return Response.json({ error: "Bad job id" }, { status: 400 });
  try {
    return Response.json({ status: await cancel(id) });
  } catch (err) {
    const { message, status } = errorMessage(err);
    return Response.json({ error: message }, { status });
  }
}
