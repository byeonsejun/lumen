"use client";

import dynamic from "next/dynamic";

const Stage3D = dynamic(() => import("@/three/Stage3D").then((m) => m.Stage3D), { ssr: false });

// 임시 홈 무대 — Task 7 에서 쇼룸으로 바뀐다
export function HomeStage() {
  return (
    <Stage3D poster="https://cdn.polyhaven.com/asset_img/thumbs/sofa_02.png?width=640" posterAlt="Ember 3인 소파" className="h-svh w-full">
      <ambientLight intensity={0.3} />
      <spotLight position={[0, 4, 2]} intensity={40} angle={0.5} penumbra={0.6} castShadow />
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
    </Stage3D>
  );
}
