import {
  ASPECTS,
  GRADES,
  LENSES,
  type AngleGrammar,
  type AspectId,
  type CameraMove,
} from "./catalog";

/** Everything the director chose on the virtual set. Serialisable; sent to the API as JSON. */
export type ShotSpec = {
  azimuth: string;
  elevation: string;
  distance: string;
  lens: string;
  grade: string;
  move: string;
  aspect: AspectId;
  duration: number;
  action: string;
  seed: number;
};

export const DEFAULT_SHOT: ShotSpec = {
  azimuth: "front-right",
  elevation: "eye",
  distance: "medium",
  lens: "35",
  grade: "none",
  move: "dolly-in",
  aspect: "16:9",
  duration: 5,
  action: "",
  seed: 0,
};

export type AnglePlan = { prompt: string; seed: number };

export type MovePlan = {
  prompt: string;
  negative: string;
  cameraLora: string | null;
  seed: number;
  width: number;
  height: number;
  frames: number;
  fps: number;
};

const FPS = 24;
const NEGATIVE =
  "blurry, low quality, distorted, warped face, extra limbs, flicker, jitter, watermark, text, subtitles";

function pick<T extends { id: string }>(list: T[], id: string, field: string): T {
  const hit = list.find((x) => x.id === id);
  if (!hit) throw new Error(`Unknown ${field}: ${id}`);
  return hit;
}

export function anglePlan(shot: ShotSpec, g: AngleGrammar): AnglePlan {
  const prompt = g.template
    .replace("{azimuth}", pick(g.azimuths, shot.azimuth, "azimuth").token)
    .replace("{elevation}", pick(g.elevations, shot.elevation, "elevation").token)
    .replace("{distance}", pick(g.distances, shot.distance, "distance").token)
    .replace(/\s+/g, " ")
    .trim();
  return { prompt, seed: shot.seed };
}

/** LTX wants frame counts of 8n+1. */
export function framesFor(seconds: number): number {
  return Math.round((seconds * FPS) / 8) * 8 + 1;
}

export function movePlan(shot: ShotSpec, moves: CameraMove[]): MovePlan {
  const move = pick(moves, shot.move, "move");
  const lens = pick(LENSES, shot.lens, "lens");
  const grade = pick(GRADES, shot.grade, "grade");
  const aspect = ASPECTS.find((a) => a.id === shot.aspect) ?? ASPECTS[0];
  const prompt = [shot.action || "the subject holds the moment, subtle natural motion", move.prompt, lens.prompt, grade.prompt, "cinematic, film still quality"]
    .map((part) => part.trim().replace(/[.\s]+$/, ""))
    .filter(Boolean)
    .join(". ");
  return {
    prompt,
    negative: NEGATIVE,
    cameraLora: move.lora,
    seed: shot.seed,
    width: aspect.w,
    height: aspect.h,
    frames: framesFor(shot.duration),
    fps: FPS,
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
