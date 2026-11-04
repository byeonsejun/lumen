"use client";

import { useCart } from "@/cart/useCart";

const STYLE = {
  primary: "w-full rounded-full bg-accent py-3 text-sm font-semibold text-bg hover:brightness-110",
  overlay: "pointer-events-auto shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg hover:brightness-110",
} as const;

/** color: 고른 색 id (원래 색 "") */
export function AddToCartButton({ slug, qty = 1, color = "", variant = "primary" }: { slug: string; qty?: number; color?: string; variant?: keyof typeof STYLE }) {
  const cart = useCart();
  return (
    <button type="button" data-testid="add-to-cart" disabled={!cart.ready} onClick={() => cart.add(slug, qty, color)} className={`${STYLE[variant]} disabled:opacity-60`}>
      담기
    </button>
  );
}
