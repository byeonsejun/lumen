"use client";

import dynamic from "next/dynamic";
import { loadStage3D } from "@/three/idle";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice, getProduct } from "@/catalog/query";
import { arrangeRoom } from "@/room/arrange";
import { posterUrl } from "@/three/models";

const Stage3D = dynamic(loadStage3D, { ssr: false });
const RoomScene = dynamic(() => import("@/room/RoomScene").then((m) => m.RoomScene), { ssr: false });

type Props = { orderId: string; totalKRW: number; paidAt: string; items: { slug: string; quantity: number; color?: string }[] };

/** 결제 완료 — 방금 산 가구 위로 불이 하나씩 켜진다. 쇼룸 첫 장면의 스포트라이트와 짝이다 */
export function CompleteView({ orderId, totalKRW, paidAt, items }: Props) {
  const [env] = useState(() => ({
    reduced: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    touch: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  }));
  // 카탈로그에서 사라진 상품은 장면에서 건너뛴다(주문 정보는 스냅샷으로 남아 있다)
  const layout = useMemo(
    () => arrangeRoom(items.flatMap((i) => (getProduct(i.slug) ? [{ product: getProduct(i.slug)!, quantity: i.quantity, color: i.color }] : []))),
    [items],
  );
  const lights = env.reduced ? "on" : "sequence";
  const first = items.find((i) => getProduct(i.slug));

  return (
    <div className="relative h-svh">
      <div data-testid="complete-room" data-lights={lights} data-paid-at={paidAt} className="absolute inset-0">
        <Stage3D poster={posterUrl(first ? getProduct(first.slug)!.polyhavenId : "sofa_02", 1024)} posterAlt="" className="h-full w-full" fallback={null}>
          <RoomScene layout={layout} lights={lights} reducedMotion={env.reduced} touch={env.touch} />
        </Stage3D>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent px-5 pb-10 pt-24 sm:px-10">
        <h1 className="text-4xl font-light sm:text-5xl">주문이 완료됐어요</h1>
        <p className="mt-3 text-sm text-muted">
          주문 번호 <span className="font-mono text-fg">{orderId}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          합계{" "}
          <span data-testid="complete-total" className="text-accent">
            {formatPrice(totalKRW)}
          </span>
        </p>
        <p className="mt-3 text-xs text-muted">테스트 결제입니다. 실제 배송되지 않아요</p>
        <Link href={`/orders`} className="pointer-events-auto mt-6 inline-block rounded-full border border-fg/30 px-5 py-2 text-sm hover:border-accent hover:text-accent">
          주문 내역 보기
        </Link>
      </div>
    </div>
  );
}
