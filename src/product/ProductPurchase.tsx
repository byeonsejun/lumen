"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/cart/useCart";
import { AddToCartButton } from "@/cart/ui/AddToCartButton";
import { ColorPicker } from "./ColorPicker";
import { useColorParam } from "./useColorParam";

export function ProductPurchase({ slug }: { slug: string }) {
  const [qty, setQty] = useState(1);
  const [color, setColor] = useColorParam(slug);
  const cart = useCart();
  const router = useRouter();
  // 고른 색 · 수량 그대로 담고 내 방으로 — 방은 장바구니로 만든다
  const placeInRoom = () => {
    cart.add(slug, qty, color);
    router.push("/room");
  };
  return (
    <>
    <ColorPicker slug={slug} color={color} onChange={setColor} />
    <div className="mt-8 flex gap-3">
      <label className="sr-only" htmlFor="qty">
        수량
      </label>
      <select
        id="qty"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="rounded-full border border-fg/25 bg-bg px-4 text-sm"
      >
        {Array.from({ length: 9 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <div className="flex-1">
        <AddToCartButton slug={slug} qty={qty} color={color} />
      </div>
    </div>
    <button
      type="button"
      disabled={!cart.ready}
      onClick={placeInRoom}
      className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-fg/25 text-sm hover:border-accent disabled:opacity-60"
    >
      내 방에 놓아 보기
    </button>
    </>
  );
}
