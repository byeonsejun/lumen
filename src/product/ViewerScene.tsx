"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { EquirectangularReflectionMapping, PerspectiveCamera } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import type { Product, Recolor } from "@/catalog/types";
import { PostFX } from "@/three/PostFX";
import { ProductModel } from "@/three/ProductModel";
import { QUALITY_PRESETS } from "@/three/quality/presets";
import { useQuality } from "@/three/quality/store";

export function ViewerScene({ product, showDims, recolor }: { product: Product; showDims: boolean; recolor?: Recolor }) {
  const [w, h, d] = product.dimensionsMm.map((v) => v / 1000);
  const size = Math.max(w, h, d);
  const preset = useQuality((s) => QUALITY_PRESETS[s.tier]);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { camera } = get();
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 32;
      camera.updateProjectionMatrix();
    }
    camera.position.set(size * 0.9, h * 0.6 + size * 0.55, size * 2.2 + 0.3);
    camera.lookAt(0, h / 2, 0);
  }, [get, size, h]);

  useEffect(() => {
    const { scene } = get();
    let alive = true;
    new HDRLoader().load(
      "/hdri/studio_1k.hdr",
      (tex) => {
        if (!alive) return tex.dispose();
        tex.mapping = EquirectangularReflectionMapping;
        scene.environment = tex;
        scene.environmentIntensity = 0.35;
      },
      undefined,
      () => {}, // 환경광 없이도 스포트라이트로 보인다
    );
    return () => {
      alive = false;
      scene.environment?.dispose();
      scene.environment = null;
    };
  }, [get]);

  return (
    <>
      <color attach="background" args={["#0f0d0b"]} />
      <fog attach="fog" args={["#0f0d0b", size * 2.5 + 1, size * 5 + 3]} />
      <ambientLight intensity={0.08} />
      <spotLight
        position={[size * 0.8, size * 2.5 + 1.5, size * 1.2 + 0.5]}
        angle={0.55}
        penumbra={0.8}
        intensity={60 * (size + 1)}
        color="#ffe0b8"
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-2, 2, -3]} intensity={0.8} color="#c9a27a" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[size * 6 + 4, 48]} />
        <meshStandardMaterial color="#1c1814" roughness={0.85} />
      </mesh>
      <group position-y={product.category === "lighting" ? 0 : 0}>
        <ProductModel id={product.polyhavenId} dimensionsMm={product.dimensionsMm} recolor={recolor} />
      </group>
      {showDims && <Dimensions w={w} h={h} d={d} mm={product.dimensionsMm} />}
      <OrbitControls
        target={[0, h / 2, 0]}
        enablePan={false}
        minDistance={size * 1.2}
        maxDistance={size * 4 + 2}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableDamping
      />
      <PostFX bloomStrength={0.3} />
    </>
  );
}

function Dimensions({ w, h, d, mm }: { w: number; h: number; d: number; mm: Product["dimensionsMm"] }) {
  const [x, z] = [w / 2, d / 2];
  const fmt = (v: number) => Math.round(v).toLocaleString("ko-KR");
  const color = "#e8b679";
  const label = (text: string, position: [number, number, number]) => (
    <Html position={position} center zIndexRange={[10, 0]}>
      <span data-testid="dimension-label" className="whitespace-nowrap rounded bg-bg/85 px-1.5 py-0.5 font-mono text-[11px] text-accent">
        {text}
      </span>
    </Html>
  );
  // drei Line 은 GLSL 셰이더라 WebGPU 에서 못 쓴다 — 얇은 막대 메시로 그린다
  const t = 0.008;
  const bar = (size: [number, number, number], position: [number, number, number]) => (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
  return (
    <group>
      {bar([w, t, t], [0, 0.01, z + 0.06])}
      {bar([t, h, t], [x + 0.06, h / 2, z])}
      {bar([t, t, d], [x + 0.06, 0.01, 0])}
      {label(`W ${fmt(mm[0])} mm`, [0, 0.02, z + 0.16])}
      {label(`H ${fmt(mm[1])} mm`, [x + 0.16, h / 2, z])}
      {label(`D ${fmt(mm[2])} mm`, [x + 0.2, 0.02, 0])}
    </group>
  );
}
