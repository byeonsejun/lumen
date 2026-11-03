"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useRef, type RefObject } from "react";
import {
  MathUtils,
  Vector3,
  type Group,
  type PointLight,
  type SpotLight,
} from "three";
import type { Product } from "@/catalog/types";
import { PostFX } from "@/three/PostFX";
import { ProductModel } from "@/three/ProductModel";
import { QUALITY_PRESETS } from "@/three/quality/presets";
import { useQuality } from "@/three/quality/store";
import { ROOM_CAMERA, ROOM_LAYOUT } from "./layout";
import {
  INTRO,
  REVEAL,
  showroomSegments,
  type ShowroomState,
} from "./timeline";

const SPACING = 4.2;
const STAGE_CAMERA = {
  position: new Vector3(0, 1.15, 4.4),
  target: new Vector3(0, 0.6, 0),
};
const ROOM_CAM = {
  position: new Vector3(...ROOM_CAMERA.position),
  target: new Vector3(...ROOM_CAMERA.target),
};
/** 방 조명이 켜지는 순서 (reveal 진행도 기준) */
const ROOM_LIGHTS = [
  {
    position: [0, 1.6, 0.25] as const,
    color: "#ffcf8f",
    at: 0.15,
    intensity: 1.6,
  }, // 펜던트 안
  {
    position: [-1.6, 1.9, -0.9] as const,
    color: "#ffb870",
    at: 0.35,
    intensity: 6,
  }, // 소파·화분 쪽
  {
    position: [2.2, 2.0, 0.8] as const,
    color: "#ffc58a",
    at: 0.55,
    intensity: 5,
  }, // 라운지 체어 쪽
  {
    position: [0, 2.6, 2.4] as const,
    color: "#ffe2bd",
    at: 0.75,
    intensity: 3,
  }, // 앞쪽 채움광
];

type Props = {
  products: Product[];
  progress: RefObject<number>;
  phase: ShowroomState["phase"];
  reducedMotion: boolean;
  touch: boolean;
  onAdd: (slug: string) => void;
};

const ease = (t: number) => t * t * (3 - 2 * t);

export function ShowroomScene({
  products,
  progress,
  phase,
  reducedMotion,
  touch,
  onAdd,
}: Props) {
  const router = useRouter();
  const preset = useQuality((s) => QUALITY_PRESETS[s.tier]);
  const spot = useRef<SpotLight>(null);
  const roomLights = useRef<(PointLight | null)[]>([]);
  const items = useRef<(Group | null)[]>([]);
  const walls = useRef<Group>(null);
  const look = useRef(new Vector3().copy(STAGE_CAMERA.target));
  const camera = useThree((s) => s.camera);
  const exploring = phase === "explore";

  useFrame((state, delta) => {
    const n = products.length;
    const x = (progress.current ?? 0) * showroomSegments(n);
    const center = MathUtils.clamp(x - INTRO, 0.5, n - 0.5);
    const introT = MathUtils.clamp(x / INTRO, 0, 1);
    const revealT = ease(MathUtils.clamp((x - INTRO - n) / REVEAL, 0, 1));
    // 목표에 거의 닿으면 붙여서 멈춘다 — 무한히 미세하게 움직이면 위에 얹힌 DOM 핫스팟이 흔들린다
    const k = (v: number, to: number, speed = 8) =>
      reducedMotion || Math.abs(to - v) < 1e-3
        ? to
        : MathUtils.damp(v, to, speed, delta);

    if (spot.current) {
      const stage = 40 + 260 * MathUtils.smoothstep(introT, 0, 0.6);
      spot.current.intensity = k(
        spot.current.intensity,
        MathUtils.lerp(stage, 60, revealT),
        6,
      );
    }
    ROOM_LIGHTS.forEach((l, i) => {
      const light = roomLights.current[i];
      if (light)
        light.intensity = k(
          light.intensity,
          revealT > l.at ? l.intensity : 0,
          5,
        );
    });
    if (walls.current) walls.current.visible = revealT > 0.01;

    items.current.forEach((g, i) => {
      if (!g) return;
      const p = products[i];
      const offset = i + 0.5 - center;
      const room = ROOM_LAYOUT[p.slug];
      const idle = reducedMotion ? 0 : state.clock.elapsedTime * 0.15;
      const stageX = offset * SPACING;
      const stageZ = -Math.abs(offset) * 1.2;
      const stageY = p.category === "lighting" ? 0.45 : 0;
      const stageRot = -0.5 + offset * 1.1 + idle * (1 - revealT);
      const to = room
        ? {
            x: MathUtils.lerp(stageX, room.position[0], revealT),
            y: MathUtils.lerp(stageY, room.position[1], revealT),
            z: MathUtils.lerp(stageZ, room.position[2], revealT),
            r: MathUtils.lerp(stageRot, room.rotationY, revealT),
          }
        : { x: stageX, y: stageY, z: stageZ, r: stageRot };
      g.position.set(
        k(g.position.x, to.x),
        k(g.position.y, to.y),
        k(g.position.z, to.z),
      );
      g.rotation.y = to.r;
    });

    // 둘러보기에선 OrbitControls 가 카메라를 잡는다 (터치 기기는 천천히 자동으로 돈다)
    if (exploring && !touch) return;
    const camTo = new Vector3().lerpVectors(
      STAGE_CAMERA.position,
      ROOM_CAM.position,
      revealT,
    );
    if (exploring && touch && !reducedMotion) {
      const a = Math.sin(state.clock.elapsedTime * 0.12) * 0.35;
      camTo.set(
        Math.sin(a) * 5.9,
        ROOM_CAM.position.y,
        Math.cos(a) * 5.9 - 0.6,
      );
    }
    const lookTo = new Vector3().lerpVectors(
      STAGE_CAMERA.target,
      ROOM_CAM.target,
      revealT,
    );
    camera.position.set(
      k(camera.position.x, camTo.x, 4),
      k(camera.position.y, camTo.y, 4),
      k(camera.position.z, camTo.z, 4),
    );
    look.current.set(
      k(look.current.x, lookTo.x, 4),
      k(look.current.y, lookTo.y, 4),
      k(look.current.z, lookTo.z, 4),
    );
    camera.lookAt(look.current);
  });

  return (
    <>
      <color attach="background" args={["#0b0a09"]} />
      <fog attach="fog" args={["#0b0a09", 6, 16]} />
      <ambientLight intensity={0.05} />
      <hemisphereLight args={["#4a3826", "#000000", 0.35]} />
      {/* 뒤에서 윤곽을 살리는 약한 역광 */}
      <directionalLight
        position={[-2, 3, -4]}
        intensity={0.6}
        color="#c9a27a"
      />
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
      {ROOM_LIGHTS.map((l, i) => (
        <pointLight
          key={i}
          ref={(el) => void (roomLights.current[i] = el)}
          position={l.position}
          color={l.color}
          intensity={0}
          distance={7}
          decay={1.6}
        />
      ))}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1f1a15" roughness={0.8} />
      </mesh>
      <group ref={walls} visible={false}>
        <mesh position={[0, 1.6, -2.2]} receiveShadow>
          <planeGeometry args={[7, 3.2]} />
          <meshStandardMaterial color="#2a231c" roughness={0.95} />
        </mesh>
        <mesh position={[-3.5, 1.6, 0]} rotation-y={Math.PI / 2} receiveShadow>
          <planeGeometry args={[4.4, 3.2]} />
          <meshStandardMaterial color="#231d17" roughness={0.95} />
        </mesh>
      </group>
      {products.map((p, i) => (
        <group
          key={p.slug}
          ref={(g) => void (items.current[i] = g)}
          position={[i * SPACING, 0, 0]}
        >
          <ProductModel
            id={p.polyhavenId}
            dimensionsMm={p.dimensionsMm}
            onClick={
              exploring ? () => router.push(`/products/${p.slug}`) : undefined
            }
          />
          {exploring && (
            <Html
              position={[0, p.dimensionsMm[1] / 1000 + 0.18, 0]}
              center
              zIndexRange={[10, 0]}
            >
              <div className="relative">
                <button
                  type="button"
                  data-testid={`room-hotspot-${p.slug}`}
                  onClick={() => router.push(`/products/${p.slug}`)}
                  className="group flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="block size-3 rounded-full bg-fg shadow-[0_0_0_6px_rgba(239,233,223,.25)]" />
                  <span className="rounded-full bg-bg/80 px-2 py-0.5 text-xs text-fg opacity-80 group-hover:opacity-100">
                    {p.name}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid={`room-add-${p.slug}`}
                  aria-label={`${p.name} 담기`}
                  onClick={() => onAdd(p.slug)}
                  className="absolute -right-8 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-accent text-sm font-semibold leading-none text-bg"
                >
                  +
                </button>
              </div>
            </Html>
          )}
        </group>
      ))}
      {exploring && !touch && (
        <OrbitControls
          target={ROOM_CAMERA.target}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.6}
          maxPolarAngle={1.35}
          minAzimuthAngle={-0.9}
          maxAzimuthAngle={0.9}
          enableDamping
        />
      )}
      <PostFX />
    </>
  );
}
