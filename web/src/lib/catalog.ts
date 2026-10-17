// Shot vocabulary for the camera rig. The angle grammar is replaced at runtime by
// workflows/manifest.json when present; these are the defaults it falls back to.

export type AngleStop = { id: string; label: string; deg: number; token: string };
export type DistanceStop = { id: string; label: string; token: string; radius: number };

export type AngleGrammar = {
  azimuths: AngleStop[];
  elevations: AngleStop[];
  distances: DistanceStop[];
  template: string;
};

export const DEFAULT_GRAMMAR: AngleGrammar = {
  azimuths: [
    { id: "front", label: "Front", deg: 0, token: "front view" },
    { id: "front-right", label: "Front ¾ R", deg: 45, token: "front-right quarter view" },
    { id: "right", label: "Right", deg: 90, token: "right side view" },
    { id: "back-right", label: "Back ¾ R", deg: 135, token: "back-right quarter view" },
    { id: "back", label: "Back", deg: 180, token: "back view" },
    { id: "back-left", label: "Back ¾ L", deg: 225, token: "back-left quarter view" },
    { id: "left", label: "Left", deg: 270, token: "left side view" },
    { id: "front-left", label: "Front ¾ L", deg: 315, token: "front-left quarter view" },
  ],
  elevations: [
    { id: "low", label: "Low", deg: -30, token: "low-angle shot" },
    { id: "eye", label: "Eye level", deg: 0, token: "eye-level shot" },
    { id: "elevated", label: "Elevated", deg: 30, token: "elevated shot" },
    { id: "high", label: "High", deg: 60, token: "high-angle shot" },
  ],
  distances: [
    { id: "close", label: "Close-up", token: "close-up", radius: 2.2 },
    { id: "medium", label: "Medium", token: "medium shot", radius: 3.4 },
    { id: "wide", label: "Wide", token: "wide shot", radius: 4.8 },
  ],
  template: "<sks> {azimuth} {elevation} {distance}",
};

export type CameraMove = {
  id: string;
  label: string;
  category: "push" | "track" | "crane" | "orbit" | "handheld" | "static";
  lora: string | null;
  prompt: string;
};

export const DEFAULT_MOVES: CameraMove[] = [
  { id: "static", label: "Locked Off", category: "static", lora: null, prompt: "static locked-off camera, tripod shot" },
  { id: "dolly-in", label: "Dolly In", category: "push", lora: null, prompt: "slow dolly in toward the subject" },
  { id: "dolly-out", label: "Dolly Out", category: "push", lora: null, prompt: "slow dolly out revealing the scene" },
  { id: "truck-left", label: "Truck Left", category: "track", lora: null, prompt: "camera trucks left, smooth lateral tracking" },
  { id: "truck-right", label: "Truck Right", category: "track", lora: null, prompt: "camera trucks right, smooth lateral tracking" },
  { id: "jib-up", label: "Crane Up", category: "crane", lora: null, prompt: "camera cranes up rising above the subject" },
  { id: "jib-down", label: "Crane Down", category: "crane", lora: null, prompt: "camera cranes down descending toward the subject" },
  { id: "orbit-left", label: "Orbit Left", category: "orbit", lora: null, prompt: "camera arcs around the subject to the left" },
  { id: "orbit-right", label: "Orbit Right", category: "orbit", lora: null, prompt: "camera arcs around the subject to the right" },
  { id: "handheld", label: "Handheld", category: "handheld", lora: null, prompt: "handheld camera, subtle natural shake" },
];

export type Lens = { id: string; label: string; mm: number; fov: number; prompt: string };

export const LENSES: Lens[] = [
  { id: "14", label: "14mm", mm: 14, fov: 104, prompt: "ultra-wide 14mm lens, strong perspective" },
  { id: "24", label: "24mm", mm: 24, fov: 74, prompt: "wide 24mm lens" },
  { id: "35", label: "35mm", mm: 35, fov: 54, prompt: "35mm lens, natural perspective" },
  { id: "50", label: "50mm", mm: 50, fov: 40, prompt: "50mm lens" },
  { id: "85", label: "85mm", mm: 85, fov: 24, prompt: "85mm portrait lens, shallow depth of field" },
  { id: "135", label: "135mm", mm: 135, fov: 15, prompt: "135mm telephoto lens, compressed background, creamy bokeh" },
];

// Grades are ours: a prompt phrase for the model plus a CSS filter for the live preview.
export type Grade = { id: string; label: string; prompt: string; css: string; swatch: [string, string] };

export const GRADES: Grade[] = [
  { id: "none", label: "As Shot", prompt: "", css: "none", swatch: ["#8a8a8a", "#d4d4d4"] },
  { id: "teal-orange", label: "Blockbuster", prompt: "teal and orange color grade, cinematic contrast", css: "contrast(1.12) saturate(1.2) sepia(0.15) hue-rotate(-8deg)", swatch: ["#0f5b66", "#f08a3c"] },
  { id: "bleach", label: "Bleach Bypass", prompt: "bleach bypass look, desaturated, high contrast, silvery highlights", css: "contrast(1.35) saturate(0.45) brightness(0.95)", swatch: ["#3a3d40", "#c9cdd0"] },
  { id: "kodak", label: "Warm Film", prompt: "warm 35mm film stock, soft halation, gentle grain", css: "sepia(0.28) saturate(1.15) contrast(1.05) brightness(1.03)", swatch: ["#7a4a22", "#f2cf94"] },
  { id: "noir", label: "Noir", prompt: "black and white film noir, hard shadows, high contrast", css: "grayscale(1) contrast(1.4) brightness(0.9)", swatch: ["#0d0d0d", "#e6e6e6"] },
  { id: "neon", label: "Neon Night", prompt: "neon-lit night, magenta and cyan practicals, wet reflections", css: "saturate(1.6) hue-rotate(18deg) contrast(1.15) brightness(0.92)", swatch: ["#2a0b4a", "#ff3fa4"] },
  { id: "pastel", label: "Soft Pastel", prompt: "soft pastel palette, airy, lifted blacks", css: "saturate(0.8) brightness(1.1) contrast(0.88)", swatch: ["#b9c8e8", "#f6d4dc"] },
  { id: "moonlight", label: "Day for Night", prompt: "day-for-night blue moonlight grade, cool shadows", css: "brightness(0.75) saturate(0.7) hue-rotate(190deg) sepia(0.2)", swatch: ["#0b1630", "#5d7bb8"] },
];

export const ASPECTS = [
  { id: "16:9", w: 1280, h: 704 },
  { id: "9:16", w: 704, h: 1280 },
  { id: "1:1", w: 960, h: 960 },
  { id: "2.39:1", w: 1536, h: 640 },
] as const;

export type AspectId = (typeof ASPECTS)[number]["id"];

export const DURATIONS = [3, 5, 8] as const;

// "Coverage" packs: one click shoots several angles, like a film set's coverage list.
export const COVERAGE_PACKS: { id: string; label: string; shots: { azimuth: string; elevation: string; distance: string }[] }[] = [
  {
    id: "dialogue",
    label: "Dialogue coverage",
    shots: [
      { azimuth: "front", elevation: "eye", distance: "medium" },
      { azimuth: "front-right", elevation: "eye", distance: "close" },
      { azimuth: "front-left", elevation: "eye", distance: "close" },
      { azimuth: "right", elevation: "eye", distance: "wide" },
    ],
  },
  {
    id: "hero",
    label: "Hero product",
    shots: [
      { azimuth: "front-right", elevation: "low", distance: "medium" },
      { azimuth: "front", elevation: "high", distance: "wide" },
      { azimuth: "back-left", elevation: "elevated", distance: "medium" },
      { azimuth: "left", elevation: "eye", distance: "close" },
    ],
  },
  {
    // Our own pick of the 12 most useful set-ups: every side at eye level, plus heroic lows and overheads.
    id: "best12",
    label: "Best 12 angles",
    shots: [
      ...["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"].map((azimuth) => ({ azimuth, elevation: "eye", distance: "medium" })),
      { azimuth: "front", elevation: "low", distance: "wide" },
      { azimuth: "front-right", elevation: "high", distance: "wide" },
      { azimuth: "front-left", elevation: "elevated", distance: "close" },
      { azimuth: "front", elevation: "eye", distance: "close" },
    ],
  },
  {
    id: "turnaround",
    label: "360° turnaround",
    shots: ["front", "right", "back", "left"].map((azimuth) => ({ azimuth, elevation: "eye", distance: "medium" })),
  },
];
