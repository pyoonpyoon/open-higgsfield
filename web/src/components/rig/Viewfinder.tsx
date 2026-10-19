"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { moveFrame } from "./geometry";
import { Subject, useSubjectTexture } from "./Subject";

type Props = {
  imageUrl: string | null;
  az: number;
  el: number;
  radius: number;
  fov: number;
  moveId: string;
  duration: number;
  aspect: number;
  gradeCss: string;
  playing: boolean;
};

function ShotCamera({ az, el, radius, fov, moveId, duration, playing, onTime }: Omit<Props, "imageUrl" | "aspect" | "gradeCss"> & { onTime: (t: number) => void }) {
  const clock = useRef(0);
  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    if (playing) clock.current = (clock.current + dt / duration) % 1.25;
    else clock.current = 0;
    const t = Math.min(clock.current, 1);
    const { position, target, zoom } = moveFrame(moveId, { az, el, radius }, t);
    camera.position.copy(position);
    camera.lookAt(target);
    const D2R = Math.PI / 180;
    const frameFov = zoom === 1 ? fov : (2 * Math.atan(Math.tan((fov * D2R) / 2) / zoom)) / D2R;
    if (camera.fov !== frameFov) {
      camera.fov = frameFov;
      camera.updateProjectionMatrix();
    }
    onTime(t);
  });
  return null;
}

function Scene({ imageUrl }: { imageUrl: string | null }) {
  const { tex, aspect } = useSubjectTexture(imageUrl);
  return (
    <>
      <color attach="background" args={["#0d0f10"]} />
      <gridHelper args={[30, 60, "#262a2e", "#181b1e"]} />
      <Subject tex={tex} aspect={aspect} />
    </>
  );
}

/** What the shot camera sees, with the move playing on a loop and the grade applied. */
export function Viewfinder(props: Props) {
  const tc = useRef<HTMLSpanElement>(null);
  const duration = props.duration;
  // Written straight to the DOM every frame; no React state, so the canvas never re-renders for it.
  const onTime = useCallback(
    (t: number) => {
      if (!tc.current) return;
      const secs = t * duration;
      tc.current.textContent = `00:00:${String(Math.floor(secs)).padStart(2, "0")}:${String(Math.floor((secs * 24) % 24)).padStart(2, "0")}`;
    },
    [duration],
  );

  return (
    <div className="relative w-full overflow-hidden rounded-[12px] bg-black" style={{ aspectRatio: props.aspect }}>
      <div className="absolute inset-0" style={{ filter: props.gradeCss === "none" ? undefined : props.gradeCss }}>
        <Canvas camera={{ fov: props.fov, near: 0.05, far: 60 }} dpr={[1, 2]} aria-hidden>
          <Scene imageUrl={props.imageUrl} />
          <ShotCamera {...props} onTime={onTime} />
        </Canvas>
      </div>
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-[6px] bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur">
        <span className={`h-1.5 w-1.5 rounded-full ${props.playing ? "bg-lime" : "bg-white/40"}`} />
        Preview
      </div>
      <div className="pointer-events-none absolute right-2 top-2 rounded-[6px] bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur">
        <span ref={tc}>00:00:00:00</span>
      </div>
    </div>
  );
}
