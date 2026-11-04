"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { colorOption, getProduct } from "@/catalog/query";
import { ProductModel } from "@/three/ProductModel";
import type { Placement } from "./arrange";
import { footprint, type RoomSize } from "./planner";

export type PlannedItem = Placement & { key: string; y: number };

type Props = {
  size: RoomSize;
  items: PlannedItem[];
  selected: string | null;
  overlaps: Set<string>;
  topView: boolean;
  onSelect: (key: string | null) => void;
  onMove: (key: string, x: number, z: number) => void;
  /** 장면이 붙었을 때 한 번 — 화면이 data-scene="ready" 로 알린다(e2e 가 기다린다) */
  onReady?: () => void;
};

const ACCENT = "#e8b679";
const DANGER = "#e0604a";
const GROUND = new Plane(new Vector3(0, 1, 0), 0);

/**
 * 내 방에 놓아 보기의 3D. 가구를 누르면 고르고 바닥 위로 끈다(바닥 평면에 레이를 쏜다).
 * 빈 곳을 누르면 선택을 풀고, 끄는 동안은 시점 돌리기를 끈다. 터치 스크롤 막기는 감싸는 div 의 CSS(touch-none)
 */
export function PlannerScene({ size, items, selected, overlaps, topView, onSelect, onMove, onReady }: Props) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ key: string; dx: number; dz: number } | null>(null);
  const span = Math.max(size.width, size.depth);
  const target = useMemo(() => new Vector3(0, 0.4, 0), []);

  useEffect(() => onReady?.(), [onReady]);

  useEffect(() => {
    if (topView) camera.position.set(0, span * 1.25 + 1.5, 0.01);
    else camera.position.set(0, span * 0.62 + 0.8, span * 0.95 + 1.4);
    camera.lookAt(target);
  }, [camera, span, topView, target]);

  // 끄는 동안은 캔버스 DOM 이벤트로 바닥 평면 위 좌표를 계산한다 (R3F 이벤트는 가구 위에서만 온다)
  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster();
    const ndc = new Vector2();
    const hit = new Vector3();
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(GROUND, hit)) onMove(d.key, hit.x + d.dx, hit.z + d.dz);
    };
    const up = () => {
      drag.current = null;
      setDragging(false);
    };
    el.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, camera, onMove]);

  const startDrag = (it: PlannedItem) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(it.key);
    const p = new Vector3();
    if (!e.ray.intersectPlane(GROUND, p)) return;
    drag.current = { key: it.key, dx: it.position[0] - p.x, dz: it.position[2] - p.z };
    setDragging(true);
  };

  const W = size.width;
  const D = size.depth;
  const grid = useMemo(() => {
    const lines: { x: number; z: number; w: number; d: number }[] = [];
    for (let x = -W / 2 + 0.5; x < W / 2 - 0.01; x += 0.5) lines.push({ x, z: 0, w: 0.008, d: D });
    for (let z = -D / 2 + 0.5; z < D / 2 - 0.01; z += 0.5) lines.push({ x: 0, z, w: W, d: 0.008 });
    return lines;
  }, [W, D]);

  return (
    <>
      <color attach="background" args={["#0b0a09"]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#5a4630", "#000000", 0.6]} />
      <directionalLight position={[2, 5, 3]} intensity={1.6} color="#ffe2bd" />
      <pointLight position={[0, size.height - 0.2, 0]} intensity={4} distance={span * 2} decay={1.2} color="#ffc98f" />

      {/* 빈 곳을 누르면 선택을 푼다 */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.002} onPointerDown={() => onSelect(null)}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#0b0a09" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#2a231c" roughness={0.9} />
      </mesh>
      {grid.map((g, i) => (
        <mesh key={i} position={[g.x, 0.001, g.z]}>
          <boxGeometry args={[g.w, 0.001, g.d]} />
          <meshBasicMaterial color="#3d342b" />
        </mesh>
      ))}
      <mesh position={[0, size.height / 2, -D / 2]}>
        <planeGeometry args={[W, size.height]} />
        <meshStandardMaterial color="#2a231c" roughness={0.95} />
      </mesh>
      <mesh position={[-W / 2, size.height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[D, size.height]} />
        <meshStandardMaterial color="#251f19" roughness={0.95} />
      </mesh>

      {items.map((it) => {
        const p = getProduct(it.slug);
        if (!p) return null;
        const on = selected === it.key;
        const bad = overlaps.has(it.key);
        const f = footprint(it);
        return (
          <group key={it.key}>
            <group position={[it.position[0], it.y, it.position[2]]} rotation-y={it.rotationY} onPointerDown={startDrag(it)}>
              <ProductModel id={p.polyhavenId} dimensionsMm={p.dimensionsMm} recolor={it.color ? colorOption(it.slug, it.color)?.recolor : undefined} />
            </group>
            {(on || bad) && (
              <mesh position={[it.position[0], 0.004, it.position[2]]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[f.w, f.d]} />
                <meshBasicMaterial color={bad ? DANGER : ACCENT} transparent opacity={on ? 0.35 : 0.22} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}

      <OrbitControls
        target={target}
        enabled={!dragging && !topView}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        minAzimuthAngle={-1}
        maxAzimuthAngle={1}
        enableDamping
      />
    </>
  );
}

