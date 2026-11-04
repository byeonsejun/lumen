"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/catalog/query";
import { priceLines } from "@/commerce/pricing";
import { useCart } from "@/cart/useCart";
import { PayButton } from "@/payments/PayButton";
import { ColorBadge } from "@/catalog/ColorBadge";

/** 주문서 — 3D 없음. 화면의 합계는 보여 주기용이고, 결제 금액은 서버가 다시 계산한다 */
export function CheckoutView() {
  const cart = useCart();
  const { lines, totalKRW } = priceLines(cart.lines);
  const [recipient, setRecipient] = useState({ name: "", phone: "", address: "" });
  const field = (key: keyof typeof recipient, label: string, autoComplete: string) => (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <input
        value={recipient[key]}
        onChange={(e) => setRecipient((r) => ({ ...r, [key]: e.target.value }))}
        autoComplete={autoComplete}
        maxLength={100}
        className="rounded-md border border-line bg-bg-raised px-3 py-2.5 text-fg outline-none focus:border-accent"
      />
    </label>
  );

  if (cart.status === "syncing") return <p className="py-20 text-center text-sm text-muted">장바구니를 불러오는 중…</p>;
  if (lines.length === 0)
    return (
      <p className="py-20 text-center">
        장바구니가 비어 있어요.{" "}
        <Link href="/products" className="text-accent underline">
          Shop
        </Link>
      </p>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <section>
        <h2 className="text-sm text-muted">받는 분</h2>
        <div className="mt-4 grid gap-4">
          {field("name", "받는 분", "name")}
          {field("phone", "연락처", "tel")}
          {field("address", "주소", "street-address")}
        </div>
        <p className="mt-6 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">테스트 결제입니다. 실제 배송되지 않아요</p>
      </section>
      <aside className="h-fit rounded-md border border-line p-5">
        <h2 className="text-sm text-muted">주문 상품</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {lines.map((l) => (
            <li key={l.slug} className="flex justify-between gap-3">
              <span className="truncate">
                {l.name} <span className="text-muted">× {l.quantity}</span> <ColorBadge slug={l.slug} color={l.color} />
              </span>
              <span className="shrink-0 tabular-nums">{formatPrice(l.subtotalKRW)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm text-muted">합계</span>
          <span data-testid="checkout-total" className="text-xl text-accent tabular-nums">
            {formatPrice(totalKRW)}
          </span>
        </div>
        <div className="mt-5">
          <PayButton recipient={recipient} amountLabel={formatPrice(totalKRW)} />
        </div>
      </aside>
    </div>
  );
}
