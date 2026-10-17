import { compile, engineMode, errorMessage, submit, type ImageSource } from "@/lib/engine";
import { accessDenied, JOB_ID, OUTPUT_ID, rateLimited } from "@/lib/guard";
import { getManifest, type Stage } from "@/lib/manifest";
import { anglePlan, movePlan, type ShotSpec } from "@/lib/shot";

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Expected multipart form data");
  }

  const stage = form.get("stage");
  if (stage !== "angle" && stage !== "move") return bad("stage must be angle or move");

  let shot: ShotSpec;
  let plan;
  try {
    shot = JSON.parse(String(form.get("shot") ?? ""));
    const m = await getManifest();
    plan = stage === "angle" ? anglePlan(shot, m.angleGrammar) : movePlan(shot, m.cameraMoves);
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Invalid shot");
  }

  const file = form.get("image");
  const sourceJobId = String(form.get("sourceJobId") ?? "");
  const sourceOutputId = String(form.get("sourceOutputId") ?? "");
  let image: ImageSource;
  if (file instanceof File) {
    if (!IMAGE_TYPES.has(file.type)) return bad("Image must be PNG, JPEG or WebP");
    if (file.size > MAX_BYTES) return bad("Image must be under 8 MB");
    image = { kind: "bytes", data: new Uint8Array(await file.arrayBuffer()), filename: file.name || "input.png", contentType: file.type };
  } else if (JOB_ID.test(sourceJobId) && OUTPUT_ID.test(sourceOutputId)) {
    image = { kind: "output", jobId: sourceJobId, outputId: sourceOutputId };
  } else {
    return bad("Provide an image or a source job output");
  }

  const mode = engineMode();
  if (mode === "dryrun") {
    // No engine configured: return the exact graph we would have run.
    const wf = await compile(stage as Stage, plan, "input.png");
    return Response.json({ mode, stage, plan, workflow: wf.json });
  }

  if (accessDenied(req)) return bad("Access code required", 401);
  if (rateLimited(req)) return bad("Rate limit reached, try again later", 429);

  try {
    const job = await submit(stage as Stage, plan, image);
    return Response.json({ mode, stage, plan, ...job });
  } catch (err) {
    const { message, status } = errorMessage(err);
    return bad(message, status);
  }
}
