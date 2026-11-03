"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/cart/useCart";

/** 담을 때마다 3초 동안 아래에 뜬다. 페이지는 그대로 */
export function CartToast() {
  const { lastAdded } = useCart();
  const [visibleAt, setVisibleAt] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!lastAdded) return;
    const t0 = window.setTimeout(() => {
      setVisibleAt(lastAdded);
      setNow(Date.now());
    }, 0);
    const t1 = window.setTimeout(() => setNow(Date.now()), 3000);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [lastAdded]);
  const show = visibleAt > 0 && now - visibleAt < 3000;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      {show && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-fg/15 bg-bg-raised/95 px-5 py-2.5 text-sm shadow-lg backdrop-blur">
          <span>담았어요</span>
          <span className="text-muted">·</span>
          <Link href="/cart" className="text-accent underline-offset-4 hover:underline">
            장바구니 보기
          </Link>
        </div>
      )}
    </div>
  );
}
