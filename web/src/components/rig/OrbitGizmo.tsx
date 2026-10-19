"use client";

import { Line } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useSubjectTexture } from "./Subject";

const R = 1.55;
const D2R = Math.PI / 180;

/** Point on the globe for a camera at (azimuth, elevation); azimuth 0 faces the subject head-on. */
function onGlobe(az: number, el: number, r = R) {
  return new THREE.Vector3(r * Math.cos(el * D2R) * Math.sin(az * D2R), r * Math.sin(el * D2R), r * Math.cos(el * D2R) * Math.cos(az * D2R));
}

function Globe({ az, el }: { az: number; el: number }) {
  const lines = useMemo(() => {
    const out: THREE.Vector3[][] = [];
    for (let lon = 0; lon < 180; lon += 30) out.push(Array.from({ length: 65 }, (_, i) => onGlobe(lon, (i / 64) * 360 - 180)));
    for (const lat of [-60, -30, 0, 30, 60]) out.push(Array.from({ length: 65 }, (_, i) => onGlobe((i / 64) * 360, lat)));
    return out;
  }, []);
  const ring = useMemo(() => Array.from({ length: 65 }, (_, i) => onGlobe((i / 64) * 360, el)), [el]);
  const cam = onGlobe(az, el);
  const quat = useMemo(() => {
    const m = new THREE.Matrix4().lookAt(cam, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [cam]);

  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#ffffff" transparent opacity={0.09} lineWidth={1} />
      ))}
      <Line points={ring} color="#d1fe17" transparent opacity={0.45} lineWidth={1.2} />
      <Line points={[cam, new THREE.Vector3()]} color="#d1fe17" transparent opacity={0.6} lineWidth={1} dashed dashSize={0.06} gapSize={0.05} />
      <group position={cam} quaternion={quat}>
        <mesh>
          <boxGeometry args={[0.3, 0.2, 0.22]} />
          <meshBasicMaterial color="#d1fe17" />
        </mesh>
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.12, 16]} />
          <meshBasicMaterial color="#131517" />
        </mesh>
      </group>
    </>
  );
}

function Card({ url }: { url: string | null }) {
  const { tex, aspect } = useSubjectTexture(url);
  const h = aspect > 1 ? 1.1 / aspect : 1.1;
  return (
    <group>
      <mesh>
        <planeGeometry args={[h * aspect, h]} />
        <meshBasicMaterial map={tex ?? undefined} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[h * aspect, h]} />
        <meshBasicMaterial color="#2a2c2f" />
      </mesh>
    </group>
  );
}

/**
 * Hold-and-drag globe: horizontal drag swings the camera around the subject, vertical drag
 * changes its height. Values are continuous while dragging; the caller snaps on release.
 */
export function OrbitGizmo({
  az,
  el,
  imageUrl,
  elRange,
  onDrag,
  onRelease,
  className = "",
}: {
  az: number;
  el: number;
  imageUrl: string | null;
  elRange: [number, number];
  onDrag: (v: { az: number; el: number }) => void;
  onRelease: (v: { az: number; el: number }) => void;
  className?: string;
}) {
  function start(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const from = { x: e.clientX, y: e.clientY, az, el };
    let cur = { az, el };
    const move = (ev: PointerEvent) => {
      cur = {
        az: (((from.az + (ev.clientX - from.x) * 0.6) % 360) + 360) % 360,
        el: THREE.MathUtils.clamp(from.el - (ev.clientY - from.y) * 0.45, elRange[0], elRange[1]),
      };
      onDrag(cur);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onRelease(cur);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      onPointerDown={start}
      className={`cursor-grab touch-none select-none active:cursor-grabbing ${className}`}
      role="img"
      aria-label={`Camera at ${Math.round(az)}° around, ${Math.round(el)}° up. Drag to move it.`}
    >
      <Canvas camera={{ position: [0, 0.9, 5.2], fov: 38 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <group rotation={[0.12, 0, 0]}>
          <Card url={imageUrl} />
          <Globe az={az} el={el} />
        </group>
      </Canvas>
    </div>
  );
}
