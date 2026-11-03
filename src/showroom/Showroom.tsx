"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/catalog/query";
import { AddToCartButton } from "@/cart/ui/AddToCartButton";
import { useCart } from "@/cart/useCart";
import type { Product } from "@/catalog/types";
import { posterUrl } from "@/three/models";
import { showroomSegments, showroomTimeline, type ShowroomState } from "./timeline";

const Stage3D = dynamic(() => import("@/three/Stage3D").then((m) => m.Stage3D), { ssr: false });
const ShowroomScene = dynamic(() => import("./ShowroomScene").then((m) => m.ShowroomScene), { ssr: false });

const sameState = (a: ShowroomState, b: ShowroomState) =>
  a.phase === b.phase && (a.phase !== "spotlight" || (b.phase === "spotlight" && a.index === b.index));

export function Showroom({ products }: { products: Product[] }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [state, setState] = useState<ShowroomState>({ phase: "intro", t: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  // Showroom 은 클라이언트에서만 의미가 있다 — 서버에선 false
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const segments = showroomSegments(products.length);
  // 3D 장면(별도 React 루트)의 이름표 + 버튼은 세션 컨텍스트를 못 읽는다 — 담기 함수를 넘겨준다
  const cart = useCart();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = section.current;
      if (!el) return;
      const range = el.offsetHeight - window.innerHeight;
      progress.current = range > 0 ? Math.min(Math.max(-el.getBoundingClientRect().top / range, 0), 1) : 0;
      const next = showroomTimeline(progress.current, products.length);
      setState((prev) => (sameState(prev, next) ? prev : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onMq();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [products.length]);

  const current = state.phase === "spotlight" ? products[state.index] : undefined;

  return (
    <section ref={section} data-testid="showroom" className="relative" style={{ height: `${segments * 100}svh` }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <Stage3D poster={posterUrl(products[0].polyhavenId, 1024)} posterAlt={products[0].name} className="h-full w-full">
          <ShowroomScene products={products} progress={progress} phase={state.phase} reducedMotion={reducedMotion} touch={touch} onAdd={(slug) => cart.add(slug)} />
        </Stage3D>
        <Overlay state={state} product={current} />
      </div>
    </section>
  );
}

function Overlay({ state, product }: { state: ShowroomState; product?: Product }) {
  return (
    <div
      data-testid="showroom-overlay"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 bg-gradient-to-t from-bg via-bg/60 to-transparent px-5 pb-10 pt-24 sm:px-10 sm:pb-14"
    >
      {state.phase === "intro" && (
        <div>
          <p className="text-xs tracking-[0.3em] text-accent">LUMEN · 3D SHOWROOM</p>
          <h1 className="mt-3 text-3xl font-light sm:text-5xl">빛이 머무는 자리</h1>
          <p className="mt-3 text-sm text-muted">스크롤해서 조명 아래의 가구를 만나 보세요</p>
        </div>
      )}
      {product && (
        <>
          <div key={product.slug} className="animate-[fadeUp_.5s_ease-out]">
            <p className="text-xs text-muted">{product.material}</p>
            <h2 className="mt-2 text-2xl font-light sm:text-4xl">{product.name}</h2>
            <p className="mt-2 text-lg text-accent">{formatPrice(product.priceKRW)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <AddToCartButton slug={product.slug} variant="overlay" />
            <Link
              href={`/products/${product.slug}`}
              className="pointer-events-auto shrink-0 rounded-full border border-fg/30 px-4 py-2 text-sm hover:border-accent hover:text-accent"
            >
              자세히 →
            </Link>
          </div>
        </>
      )}
      {state.phase === "reveal" && <h2 className="text-2xl font-light sm:text-4xl">한 방에 모아 보면</h2>}
      {state.phase === "explore" && (
        <>
          <div data-testid="showroom-explore">
            <h2 className="text-2xl font-light sm:text-4xl">가구를 눌러 자세히 보세요</h2>
            <p className="mt-2 text-sm text-muted">드래그해서 방을 둘러볼 수 있어요</p>
          </div>
          <button
            type="button"
            disabled
            className="pointer-events-auto shrink-0 rounded-full border border-fg/20 px-4 py-2 text-sm text-muted disabled:cursor-not-allowed"
          >
            내 방에 놓아 보기 (준비 중)
          </button>
        </>
      )}
    </div>
  );
}
