"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { placeholderTexture, SUBJECT_HEIGHT } from "./geometry";

export function useSubjectTexture(url: string | null) {
  const placeholder = useMemo(() => (typeof document === "undefined" ? null : placeholderTexture()), []);
  const [loaded, setLoaded] = useState<{ url: string; tex: THREE.Texture } | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (alive) setLoaded({ url, tex });
      else tex.dispose();
    });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => () => loaded?.tex.dispose(), [loaded]);

  const tex = url && loaded?.url === url ? loaded.tex : placeholder;
  const img = tex?.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 0.5;
  return { tex, aspect };
}

/** The subject as a standing card: the uploaded image on the front, a dim clay back. */
export function Subject({ tex, aspect }: { tex: THREE.Texture | null; aspect: number }) {
  const h = aspect > 1 ? SUBJECT_HEIGHT / Math.min(aspect, 1.8) : SUBJECT_HEIGHT;
  const w = h * aspect;
  return (
    <group position={[0, SUBJECT_HEIGHT / 2, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex ?? undefined} toneMapped={false} side={THREE.FrontSide} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex ?? undefined} color="#3b3f44" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -SUBJECT_HEIGHT / 2 + 0.002, 0]}>
        <circleGeometry args={[Math.max(w, 0.6) * 0.6, 48]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
