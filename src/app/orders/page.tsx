import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { formatPrice } from "@/catalog/query";
import { listMyPaidOrders } from "@/orders/queries";

export const metadata: Metadata = { title: "내 주문 — LUMEN" };

const date = (d: Date | null) => (d ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(d) : "");

// 로그인 확인은 src/proxy.ts
export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
      <h1 className="text-3xl font-light">내 주문</h1>
      <Suspense fallback={<div className="mt-10 h-40 animate-pulse rounded bg-bg-raised" />}>
        <OrderList />
      </Suspense>
    </div>
  );
}

async function OrderList() {
  const userId = (await auth())?.viewer?.id;
  const orders = userId ? await listMyPaidOrders(userId) : [];
  if (orders.length === 0)
    return (
      <div className="mt-16 text-center">
        <p>아직 주문한 가구가 없어요</p>
        <Link href="/" className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline">
          쇼룸 둘러보기
        </Link>
      </div>
    );
  return (
    <ul className="mt-8 divide-y divide-line border-y border-line">
      {orders.map((o) => (
        <li key={o.id}>
          <Link data-testid="order-row" href={`/orders/${o.id}`} className="flex items-baseline justify-between gap-4 py-4 hover:text-accent">
            <span>
              <span className="block text-xs text-muted">{date(o.paidAt)}</span>
              <span className="mt-1 block">{o.orderName}</span>
            </span>
            <span className="shrink-0 tabular-nums text-accent">{formatPrice(o.totalKRW)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
