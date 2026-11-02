"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Product } from "@/catalog/types";
import { posterUrl } from "@/three/models";

const STAGE_CLASS =
  "aspect-square w-full overflow-hidden rounded-sm bg-[radial-gradient(ellipse_at_50%_40%,#231e19,#0b0a09_70%)] sm:aspect-[4/3]";

// 로딩 중에도 같은 크기를 잡아 레이아웃이 밀리지 않게 한다 (CLS)
const Stage3D = dynamic(() => import("@/three/Stage3D").then((m) => m.Stage3D), {
  ssr: false,
  loading: () => <div className={STAGE_CLASS} />,
});
const ViewerScene = dynamic(() => import("./ViewerScene").then((m) => m.ViewerScene), { ssr: false });

export function ProductViewer({ product }: { product: Product }) {
  const [showDims, setShowDims] = useState(false);
  return (
    <div className="relative">
      <Stage3D
        poster={posterUrl(product.polyhavenId, 1024)}
        posterAlt={product.name}
        className={STAGE_CLASS}
      >
        <ViewerScene product={product} showDims={showDims} />
      </Stage3D>
      <div className="absolute left-3 top-3 flex gap-2">
        <button
          type="button"
          aria-pressed={showDims}
          onClick={() => setShowDims((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs backdrop-blur ${showDims ? "border-accent text-accent" : "border-fg/25 text-fg/80"}`}
        >
          치수 보기
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">드래그해서 돌려 보고, 스크롤·핀치로 확대해요</p>
    </div>
  );
}
