"use client";

import Link from "next/link";
import { NAV_ITEM } from "@/auth-ui/nav-item";
import { useCart } from "@/cart/useCart";

export function CartBadge() {
  const { count, status } = useCart();
  return (
    <Link href="/cart" data-testid="cart-link" data-sync={status} className={`${NAV_ITEM} relative`} aria-label={`장바구니 ${count}개`}>
      장바구니
      {count > 0 && (
        <span data-testid="cart-count" className="ml-1 rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-bg">
          {count}
        </span>
      )}
    </Link>
  );
}
