"use client";

import dynamic from "next/dynamic";
import { getFeatured } from "@/catalog/query";
import { posterUrl } from "@/three/models";
import { ProductModel } from "@/three/ProductModel";

const Stage3D = dynamic(() => import("@/three/Stage3D").then((m) => m.Stage3D), { ssr: false });

// 임시 홈 무대 — Task 7 에서 쇼룸으로 바뀐다
export function HomeStage() {
  const hero = getFeatured()[0];
  return (
    <Stage3D poster={posterUrl(hero.polyhavenId)} posterAlt={hero.name} className="h-svh w-full">
      <ambientLight intensity={0.3} />
      <spotLight position={[0, 4, 2]} intensity={40} angle={0.5} penumbra={0.6} castShadow />
      <ProductModel id={hero.polyhavenId} />
    </Stage3D>
  );
}
