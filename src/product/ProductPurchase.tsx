"use client";

import { useState } from "react";
import { AddToCartButton } from "@/cart/ui/AddToCartButton";

export function ProductPurchase({ slug }: { slug: string }) {
  const [qty, setQty] = useState(1);
  return (
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
        <AddToCartButton slug={slug} qty={qty} />
      </div>
    </div>
  );
}
