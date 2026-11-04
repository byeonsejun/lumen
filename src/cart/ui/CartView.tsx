"use client";

import dynamic from "next/dynamic";
import { loadStage3D } from "@/three/idle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { formatPrice, getProduct } from "@/catalog/query";
import { priceLines } from "@/commerce/pricing";
import { useCart } from "@/cart/useCart";
import { arrangeRoom } from "@/room/arrange";
import { posterUrl } from "@/three/models";
import { useQuality } from "@/three/quality/store";
import { CartList } from "./CartList";

const Stage3D = dynamic(loadStage3D, { ssr: false });
const RoomScene = dynamic(() => import("@/room/RoomScene").then((m) => m.RoomScene), { ssr: false });

export function CartView() {
  const cart = useCart();
  const router = useRouter();
  const { status } = useSession();
  const noRender = useQuality((s) => s.backend === "none");
  const [env] = useState(() =>
    typeof window === "undefined"
      ? { touch: false, reduced: false }
      : { touch: window.matchMedia("(pointer: coarse)").matches, reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches },
  );
  const items = useMemo(() => cart.lines.flatMap((l) => (getProduct(l.slug) ? [{ product: getProduct(l.slug)!, quantity: l.quantity, color: l.color }] : [])), [cart.lines]);
  const layout = useMemo(() => arrangeRoom(items), [items]);
  const { totalKRW } = priceLines(cart.lines);
  const empty = cart.lines.length === 0;
  const checkout = () => router.push(status === "authenticated" ? "/checkout" : `/login?callbackUrl=${encodeURIComponent("/checkout")}`);

  return (
    <div className={`grid min-h-svh pt-16 ${noRender ? "" : "lg:grid-cols-[3fr_2fr]"}`}>
      {!noRender && (
        <div data-testid="cart-room" data-focused={cart.focused ?? ""} className="relative h-[45svh] lg:sticky lg:top-0 lg:h-svh">
          <Stage3D poster={posterUrl(items[0]?.product.polyhavenId ?? "sofa_02", 1024)} posterAlt="" className="h-full w-full" fallback={null}>
            <RoomScene layout={layout} focused={cart.focused} onPick={(key) => cart.focus(key)} touch={env.touch} reducedMotion={env.reduced} />
          </Stage3D>
          {empty && (
            <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-muted">이 방은 아직 비어 있어요</div>
          )}
          {!empty && <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted">내 방 미리보기 · 드래그해서 둘러보기</p>}
        </div>
      )}
      <section className={`px-5 pb-16 pt-6 sm:px-8 ${noRender ? "mx-auto w-full max-w-2xl" : "lg:pt-10"}`}>
        <h1 className="text-2xl font-light">장바구니</h1>
        {empty ? (
          <div className="mt-10 text-center">
            <p>아직 담은 가구가 없어요</p>
            <p className="mt-6 flex justify-center gap-4 text-sm">
              <Link href="/" className="inline-flex min-h-11 items-center px-2 text-accent underline-offset-4 hover:underline">
                쇼룸
              </Link>
              <Link href="/products" className="inline-flex min-h-11 items-center px-2 text-accent underline-offset-4 hover:underline">
                Shop
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <CartList lines={cart.lines} focused={cart.focused} onFocus={cart.focus} onSet={cart.set} onRemove={cart.remove} />
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">합계</span>
              <span data-testid="cart-total" className="text-xl text-accent tabular-nums">
                {formatPrice(totalKRW)}
              </span>
            </div>
            <button type="button" onClick={checkout} className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-semibold text-bg hover:brightness-110">
              주문하기
            </button>
            <Link href="/room" className="mt-3 flex min-h-11 items-center justify-center rounded-full border border-fg/25 text-sm hover:border-accent">
              내 방 크기로 놓아 보기
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
