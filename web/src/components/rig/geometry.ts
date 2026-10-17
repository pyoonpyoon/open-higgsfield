import * as THREE from "three";

export const SUBJECT_HEIGHT = 2;
export const TARGET = new THREE.Vector3(0, SUBJECT_HEIGHT / 2, 0);
const D2R = Math.PI / 180;

/** Azimuth 0 = facing the subject head-on; positive azimuth swings to camera-right. */
export function shotPosition(azDeg: number, elDeg: number, radius: number): THREE.Vector3 {
  const az = azDeg * D2R;
  const el = elDeg * D2R;
  return new THREE.Vector3(
    radius * Math.cos(el) * Math.sin(az),
    TARGET.y + radius * Math.sin(el),
    radius * Math.cos(el) * Math.cos(az),
  );
}

export function nearest<T extends { deg: number }>(stops: T[], deg: number, circular = false): T {
  let best = stops[0];
  let bestD = Infinity;
  for (const s of stops) {
    let d = Math.abs(s.deg - deg);
    if (circular) d = Math.min(d, 360 - d);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Where the shot camera sits at time t∈[0,1] of a move, for the live viewfinder preview.
 * Moves come from the manifest, so this reads intent from the id rather than a fixed list.
 */
export function moveFrame(
  moveId: string,
  base: { az: number; el: number; radius: number },
  t: number,
): { position: THREE.Vector3; target: THREE.Vector3; zoom: number } {
  const k = ease(t);
  const id = moveId.toLowerCase();
  const { el } = base;
  let { az, radius } = base;
  const target = TARGET.clone();
  const sign = id.includes("left") || id.includes("down") ? -1 : 1;
  let lateral = 0;
  let lift = 0;
  let aim = { x: 0, y: 0 }; // pan/tilt: camera stays put, only where it looks changes

  if (id.includes("orbit") || id.includes("arc")) az += sign * 35 * k;
  else if (id.includes("dolly-zoom") || id.includes("vertigo")) radius *= 1 - 0.45 * k;
  else if (id.includes("pan")) aim = { x: sign * 1.4 * k, y: 0 };
  else if (id.includes("tilt")) aim = { x: 0, y: sign * 1.1 * k };
  else if (id.includes("truck") || id.includes("track") || id.includes("left") || id.includes("right")) lateral = sign * 0.9 * k;
  else if (id.includes("dolly") || id.includes("push") || id.includes("zoom")) radius *= id.includes("out") ? 0.72 + 0.4 * k : 1 - 0.38 * k;
  else if (id.includes("jib") || id.includes("crane") || id.includes("ped")) lift = sign * 1.1 * k;

  const position = shotPosition(az, el, radius);
  const forward = target.clone().sub(position).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  if (lateral || lift) {
    const offset = right.clone().multiplyScalar(lateral).add(new THREE.Vector3(0, lift, 0));
    position.add(offset);
    target.add(offset.multiplyScalar(0.85));
  }
  if (aim.x || aim.y) target.add(right.multiplyScalar(aim.x)).add(new THREE.Vector3(0, aim.y, 0));
  // Dolly zoom keeps the subject's size: widen the lens by exactly the distance ratio.
  const zoom = id.includes("dolly-zoom") || id.includes("vertigo") ? radius / base.radius : 1;
  if (id.includes("hand")) {
    const s = t * Math.PI * 2;
    position.add(new THREE.Vector3(Math.sin(s * 3.1) * 0.03, Math.sin(s * 4.7) * 0.025, Math.sin(s * 2.3) * 0.02));
  }
  return { position, target, zoom };
}

/** Placeholder subject: a clay mannequin silhouette drawn on a canvas. */
export function placeholderTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, 1024);
  bg.addColorStop(0, "#23272b");
  bg.addColorStop(1, "#15181b");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "#c9b79c";
  g.beginPath();
  g.ellipse(256, 250, 92, 112, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(90, 1024);
  g.bezierCurveTo(90, 560, 160, 430, 256, 430);
  g.bezierCurveTo(352, 430, 422, 560, 422, 1024);
  g.fill();
  g.fillStyle = "#ffb000";
  g.font = "600 34px ui-monospace, monospace";
  g.textAlign = "center";
  g.fillText("DROP A SUBJECT", 256, 980);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
