"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, Vector3, type PointLight, type SpotLight } from "three";
import { getProduct } from "@/catalog/query";
import { PostFX } from "@/three/PostFX";
import { ProductModel } from "@/three/ProductModel";
import { QUALITY_PRESETS } from "@/three/quality/presets";
import { useQuality } from "@/three/quality/store";
import type { RoomLayout } from "./arrange";
import { focusBeam } from "./focus";

export type RoomLights = "on" | "sequence" | "off";

type Props = {
  layout: RoomLayout;
  focused?: string | null;
  onPick?: (slug: string) => void;
  /** sequence: 가구마다 0.4초 간격으로 불이 켜지고 마지막에 방 전체 (결제 완료 장면) */
  lights?: RoomLights;
  touch?: boolean;
  reducedMotion?: boolean;
};

const WALL_H = 2.8;
const SEQ_STEP = 0.4;
const MAX_SPOTS = 6; // 가구별 스포트라이트 상한 — 조명 수가 곧 GPU 비용이다

/** 장바구니 "내 방" 과 결제 완료 장면이 같이 쓰는 방 */
export function RoomScene({ layout, focused = null, onPick, lights = "on", touch = false, reducedMotion = false }: Props) {
  const preset = useQuality((s) => QUALITY_PRESETS[s.tier]);
  const { width: W, depth: D, placements } = layout;
  const size = Math.max(W, D);
  const camera = useThree((s) => s.camera);
  const fill = useRef<(PointLight | null)[]>([]);
  const focusSpot = useRef<SpotLight>(null);
  const spots = useRef<(SpotLight | null)[]>([]);
  const started = useRef<number | null>(null);
  const target = useMemo(() => new Vector3(0, 0.5, -0.2), []);

  // 가구별 조명은 바닥 가구 중 앞에서부터 최대 6개
  const spotFor = useMemo(() => placements.filter((p) => p.level !== "surface").slice(0, MAX_SPOTS), [placements]);
  // 같은 가구가 여러 개여도 전부 비추도록 (첫 번째 것만 비추던 문제)
  const beam = useMemo(() => focusBeam(placements, focused), [placements, focused]);

  useEffect(() => {
    camera.position.set(0, size * 0.62 + 0.6, size * 0.95 + 1.2);
    camera.lookAt(target);
  }, [camera, size, target]);

  useFrame((state, delta) => {
    if (started.current === null) started.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - started.current;
    const k = (v: number, to: number) => (reducedMotion ? to : MathUtils.damp(v, to, 6, delta));
    const seq = lights === "sequence" && !reducedMotion;
    const allOnAt = spotFor.length * SEQ_STEP + 0.4;
    const roomOn = lights === "off" ? 0 : seq ? (t > allOnAt ? 1 : 0) : 1;
    const dim = focused ? 0.3 : 1;

    fill.current.forEach((l) => l && (l.intensity = k(l.intensity, 3.2 * roomOn * dim)));
    spots.current.forEach((s, i) => {
      if (!s) return;
      const p = spotFor[i];
      const on = lights === "off" ? 0 : seq ? (t > (i + 1) * SEQ_STEP ? 1 : 0) : focused ? 0 : 0.6;
      s.intensity = k(s.intensity, (focused === p.slug ? 0 : 60) * on);
    });
    if (focusSpot.current) {
      focusSpot.current.intensity = k(focusSpot.current.intensity, beam ? 140 : 0);
      if (beam) {
        focusSpot.current.position.set(...beam.position);
        focusSpot.current.angle = beam.angle;
        focusSpot.current.target.position.set(...beam.target);
        focusSpot.current.target.updateMatrixWorld();
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#0b0a09"]} />
      <fog attach="fog" args={["#0b0a09", size * 1.6, size * 3.2]} />
      <ambientLight intensity={0.06} />
      <hemisphereLight args={["#4a3826", "#000000", 0.3]} />
      {[
        [-W / 4, 2.2, -D / 4],
        [W / 4, 2.2, D / 6],
        [0, 2.4, D / 3],
      ].map((pos, i) => (
        <pointLight key={i} ref={(el) => void (fill.current[i] = el)} position={pos as [number, number, number]} color="#ffc98f" intensity={0} distance={size * 2} decay={1.4} />
      ))}
      {spotFor.map((p, i) => (
        <spotLight
          key={`${p.slug}#${p.instance}`}
          ref={(el) => {
            spots.current[i] = el;
            if (el) {
              el.target.position.set(p.position[0], 0, p.position[2]);
              el.target.updateMatrixWorld();
            }
          }}
          position={[p.position[0], 3.4, p.position[2] + 0.3]}
          angle={0.45}
          penumbra={0.8}
          color="#ffd6a0"
          intensity={0}
          castShadow={preset.shadows && i < 2}
          shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        />
      ))}
      <spotLight ref={focusSpot} angle={0.4} penumbra={0.7} color="#ffe2bd" intensity={0} castShadow={preset.shadows} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#231d17" roughness={0.85} />
      </mesh>
      <mesh position={[0, WALL_H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, WALL_H]} />
        <meshStandardMaterial color="#2a231c" roughness={0.95} />
      </mesh>
      <mesh position={[-W / 2, WALL_H / 2, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, WALL_H]} />
        <meshStandardMaterial color="#241e18" roughness={0.95} />
      </mesh>
      <mesh position={[W / 2, WALL_H / 2, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, WALL_H]} />
        <meshStandardMaterial color="#241e18" roughness={0.95} />
      </mesh>

      {placements.map((p) =>
        getProduct(p.slug) ? (
          <group key={`${p.slug}#${p.instance}`} position={p.position} rotation-y={p.rotationY}>
            <ProductModel id={getProduct(p.slug)!.polyhavenId} dimensionsMm={getProduct(p.slug)!.dimensionsMm} onClick={onPick ? () => onPick(p.slug) : undefined} />
            {p.label && (
              <Html position={[0, getProduct(p.slug)!.dimensionsMm[1] / 1000 + 0.15, 0]} center zIndexRange={[10, 0]}>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-bg">{p.label}</span>
              </Html>
            )}
          </group>
        ) : null,
      )}

      {!touch && (
        <OrbitControls
          target={target}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={0.5}
          maxPolarAngle={1.3}
          minAzimuthAngle={-0.8}
          maxAzimuthAngle={0.8}
          enableDamping
        />
      )}
      {touch && !reducedMotion && <TouchSway size={size} target={target} />}
      <PostFX />
    </>
  );
}

/** 터치 기기는 손가락이 페이지 스크롤을 하도록 두고, 카메라가 천천히 혼자 왕복한다 (1차와 같은 판단) */
function TouchSway({ size, target }: { size: number; target: Vector3 }) {
  useFrame((state) => {
    const a = Math.sin(state.clock.elapsedTime * 0.12) * 0.35;
    const r = size * 0.95 + 1.2;
    state.camera.position.set(Math.sin(a) * r, size * 0.62 + 0.6, Math.cos(a) * r);
    state.camera.lookAt(target);
  });
  return null;
}
