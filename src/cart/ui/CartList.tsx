"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatPrice, getProduct } from "@/catalog/query";
import type { CartLine } from "@/cart/lines";
import { posterUrl } from "@/three/models";

type Props = {
  lines: CartLine[];
  focused: string | null;
  onFocus: (slug: string | null) => void;
  onSet: (slug: string, qty: number) => void;
  onRemove: (slug: string) => void;
};

export function CartList({ lines, focused, onFocus, onSet, onRemove }: Props) {
  const rows = useRef<Map<string, HTMLLIElement>>(new Map());
  // 방에서 가구를 누르면 그 줄이 보이게
  useEffect(() => {
    if (focused) rows.current.get(focused)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focused]);

  return (
    <ul className="divide-y divide-line" onMouseLeave={() => onFocus(null)}>
      {lines.map((l) => {
        const p = getProduct(l.slug);
        if (!p) return null;
        const active = focused === l.slug;
        return (
          <li
            key={l.slug}
            ref={(el) => void (el ? rows.current.set(l.slug, el) : rows.current.delete(l.slug))}
            data-testid={`cart-line-${l.slug}`}
            data-focused={active ? "true" : "false"}
            onMouseEnter={() => onFocus(l.slug)}
            onFocus={() => onFocus(l.slug)}
            onClick={() => onFocus(l.slug)}
            className={`flex gap-4 py-4 transition-colors ${active ? "bg-bg-raised" : ""}`}
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-[radial-gradient(ellipse_at_50%_40%,#2a2420,#0f0d0b_70%)]">
              <Image src={posterUrl(p.polyhavenId, 256)} alt="" fill sizes="80px" className="object-contain p-2" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/products/${p.slug}`} className="truncate text-sm hover:text-accent">
                {p.name}
              </Link>
              <p className="mt-1 text-xs text-muted">{formatPrice(p.priceKRW)}</p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                <div className="flex items-center rounded-full border border-fg/20 text-sm">
                  <button type="button" aria-label="수량 줄이기" disabled={l.quantity <= 1} onClick={(e) => (e.stopPropagation(), onSet(l.slug, l.quantity - 1))} className="px-3 py-1 disabled:opacity-30">
                    −
                  </button>
                  <span aria-label="수량" className="w-6 text-center tabular-nums">
                    {l.quantity}
                  </span>
                  <button type="button" aria-label="수량 늘리기" disabled={l.quantity >= 9} onClick={(e) => (e.stopPropagation(), onSet(l.slug, l.quantity + 1))} className="px-3 py-1 disabled:opacity-30">
                    +
                  </button>
                </div>
                <button type="button" onClick={(e) => (e.stopPropagation(), onRemove(l.slug))} className="text-xs text-muted hover:text-fg">
                  빼기
                </button>
              </div>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-accent">{formatPrice(p.priceKRW * l.quantity)}</p>
          </li>
        );
      })}
    </ul>
  );
}
