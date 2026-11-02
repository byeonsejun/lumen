"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { MathUtils, type Group, type SpotLight } from "three";
import type { Product } from "@/catalog/types";
import { PostFX } from "@/three/PostFX";
import { ProductModel } from "@/three/ProductModel";
import { QUALITY_PRESETS } from "@/three/quality/presets";
import { useQuality } from "@/three/quality/store";
import { INTRO, showroomSegments } from "./timeline";

const SPACING = 4.2;
const CAMERA = { position: [0, 1.15, 4.4] as const, target: [0, 0.6, 0] as const };

type Props = { products: Product[]; progress: RefObject<number>; reducedMotion: boolean };

export function ShowroomScene({ products, progress, reducedMotion }: Props) {
  const camera = useThree((s) => s.camera);
  const preset = useQuality((s) => QUALITY_PRESETS[s.tier]);
  const spot = useRef<SpotLight>(null);
  const items = useRef<(Group | null)[]>([]);

  useEffect(() => {
    camera.position.set(...CAMERA.position);
    camera.lookAt(...CAMERA.target);
  }, [camera]);

  useFrame((state, delta) => {
    const total = showroomSegments(products.length);
    const x = (progress.current ?? 0) * total;
    // 가구 i 가 무대 가운데에 오는 지점은 INTRO + i + 0.5. 그 앞(intro)·뒤(reveal 이후)는 첫/마지막 가구에 멈춘다
    const center = MathUtils.clamp(x - INTRO, 0.5, products.length - 0.5);
    const introT = MathUtils.clamp(x / INTRO, 0, 1);

    if (spot.current) {
      // 도입: 스포트라이트가 서서히 켜진다
      const target = 40 + 260 * MathUtils.smoothstep(introT, 0, 0.6);
      spot.current.intensity = reducedMotion ? target : MathUtils.damp(spot.current.intensity, target, 6, delta);
    }

    items.current.forEach((g, i) => {
      if (!g) return;
      const offset = i + 0.5 - center;
      const tx = offset * SPACING;
      g.position.x = reducedMotion ? tx : MathUtils.damp(g.position.x, tx, 8, delta);
      g.position.z = -Math.abs(offset) * 1.2;
      // 스크롤에 따라 돌고, 멈춰 있을 땐 천천히 계속 돈다
      const idle = reducedMotion ? 0 : state.clock.elapsedTime * 0.15;
      g.rotation.y = -0.5 + offset * 1.1 + idle;
    });
  });

  return (
    <>
      <color attach="background" args={["#0b0a09"]} />
      <fog attach="fog" args={["#0b0a09", 5, 13]} />
      <ambientLight intensity={0.05} />
      <hemisphereLight args={["#4a3826", "#000000", 0.35]} />
      {/* 뒤에서 윤곽을 살리는 약한 역광 */}
      <directionalLight position={[-2, 3, -4]} intensity={0.6} color="#c9a27a" />
      <spotLight
        ref={spot}
        position={[0, 5.2, 0.6]}
        angle={0.42}
        penumbra={0.75}
        intensity={0}
        color="#ffd6a0"
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-bias={-0.0004}
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1f1a15" roughness={0.8} />
      </mesh>
      {products.map((p, i) => (
        <group key={p.slug} ref={(g) => void (items.current[i] = g)} position={[(i + 0.5 - 0.5) * SPACING, 0, 0]}>
          <group position-y={p.category === "lighting" ? 0.45 : 0}>
            <ProductModel id={p.polyhavenId} />
          </group>
        </group>
      ))}
      <PostFX />
    </>
  );
}
