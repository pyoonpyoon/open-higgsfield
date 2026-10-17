"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AngleGrammar } from "@/lib/catalog";
import { nearest, shotPosition, TARGET } from "./geometry";
import { Subject, useSubjectTexture } from "./Subject";

export type RigValue = { azimuth: string; elevation: string; distance: string };

type Props = {
  grammar: AngleGrammar;
  value: RigValue;
  onChange: (v: RigValue) => void;
  imageUrl: string | null;
};

const AMBER = "#ffb000";

function CameraGizmo({ position, active }: { position: THREE.Vector3; active: boolean }) {
  const quat = useMemo(() => {
    const m = new THREE.Matrix4().lookAt(position, TARGET, new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [position]);
  return (
    <group position={position} quaternion={quat}>
      <mesh>
        <boxGeometry args={[0.32, 0.22, 0.4]} />
        <meshStandardMaterial color={active ? "#ffd27a" : AMBER} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.2, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.08, 0.18, 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 20]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
    </group>
  );
}

function Rig({ grammar, value, onChange, imageUrl }: Props) {
  const { tex, aspect } = useSubjectTexture(imageUrl);
  const az = grammar.azimuths.find((a) => a.id === value.azimuth) ?? grammar.azimuths[0];
  const el = grammar.elevations.find((e) => e.id === value.elevation) ?? grammar.elevations[0];
  const dist = grammar.distances.find((d) => d.id === value.distance) ?? grammar.distances[0];
  const [drag, setDrag] = useState<{ az: number; el: number } | null>(null);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  const live = drag ?? { az: az.deg, el: el.deg };
  const camPos = useMemo(() => shotPosition(live.az, live.el, dist.radius), [live.az, live.el, dist.radius]);
  const elMin = Math.min(...grammar.elevations.map((e) => e.deg));
  const elMax = Math.max(...grammar.elevations.map((e) => e.deg));

  const stops = useMemo(
    () =>
      grammar.azimuths.flatMap((a) =>
        grammar.elevations.map((e) => ({ a, e, p: shotPosition(a.deg, e.deg, dist.radius) })),
      ),
    [grammar, dist.radius],
  );

  const ring = useMemo(
    () => Array.from({ length: 97 }, (_, i) => shotPosition((i / 96) * 360, 0, dist.radius).setY(0.01)),
    [dist.radius],
  );

  // Drag in screen space: horizontal swings azimuth, vertical changes elevation. Snaps on release.
  function beginDrag(ev: ThreeEvent<PointerEvent>) {
    ev.stopPropagation();
    if (controls.current) controls.current.enabled = false;
    const start = { x: ev.clientX, y: ev.clientY, az: az.deg, el: el.deg };
    let current = { az: start.az, el: start.el };
    setDrag(current);
    const move = (e: PointerEvent) => {
      current = {
        az: (((start.az + (e.clientX - start.x) * 0.45) % 360) + 360) % 360,
        el: THREE.MathUtils.clamp(start.el + (e.clientY - start.y) * -0.35, elMin, elMax),
      };
      setDrag(current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (controls.current) controls.current.enabled = true;
      setDrag(null);
      const a = nearest(grammar.azimuths, current.az, true);
      const e = nearest(grammar.elevations, current.el);
      onChange({ ...value, azimuth: a.id, elevation: e.id });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <>
      <color attach="background" args={["#101214"]} />
      <fog attach="fog" args={["#101214", 9, 20]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} />
      <gridHelper args={[16, 32, "#2f3439", "#1c1f22"]} />

      <Subject tex={tex} aspect={aspect} />

      <Line points={ring} color="#3a3f45" lineWidth={1} />
      {grammar.azimuths.map((a) => {
        const p = shotPosition(a.deg, 0, dist.radius + 0.35).setY(0.01);
        const q = shotPosition(a.deg, 0, dist.radius - 0.15).setY(0.01);
        return <Line key={a.id} points={[q, p]} color={a.id === az.id ? AMBER : "#5a6067"} lineWidth={a.id === az.id ? 2.5 : 1} />;
      })}

      {/* Every pose the angle model knows: click to jump. */}
      {stops.map(({ a, e, p }) => {
        const on = a.id === az.id && e.id === el.id;
        return (
          <mesh
            key={`${a.id}-${e.id}`}
            position={p}
            onClick={(ev) => {
              ev.stopPropagation();
              onChange({ ...value, azimuth: a.id, elevation: e.id });
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <sphereGeometry args={[on ? 0.07 : 0.045, 12, 12]} />
            <meshBasicMaterial color={on ? AMBER : "#6c7279"} transparent opacity={on ? 1 : 0.55} />
          </mesh>
        );
      })}

      <Line points={[camPos, TARGET]} color={AMBER} lineWidth={1} dashed dashSize={0.12} gapSize={0.08} />

      <group
        onPointerDown={beginDrag}
        onPointerOver={() => (document.body.style.cursor = "grab")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <CameraGizmo position={camPos} active={Boolean(drag)} />
      </group>

      <OrbitControls
        ref={controls}
        target={TARGET}
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.49}
      />
    </>
  );
}

export function SetView(props: Props) {
  return (
    <Canvas
      camera={{ position: [5.2, 3.6, 6.4], fov: 42 }}
      dpr={[1, 2]}
      onPointerMissed={() => (document.body.style.cursor = "")}
      aria-label="3D set: drag the amber camera around the subject, or click a dot to jump to an angle"
    >
      <Rig {...props} />
    </Canvas>
  );
}
