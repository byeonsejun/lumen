import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { formatPrice } from "@/catalog/query";
import { getMyOrder } from "@/orders/queries";
import { ColorBadge } from "@/catalog/ColorBadge";

export const metadata: Metadata = { title: "주문 상세 — LUMEN" };

type Params = Promise<{ id: string }>;
const dateTime = (d: Date | null) => (d ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(d) : "-");

// 로그인 · 주인 확인(404)은 src/proxy.ts 에서 응답 전에 한다. 3D 없음
export default function OrderDetailPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
      <Link href="/orders" className="text-xs text-muted hover:text-fg">
        ← 내 주문
      </Link>
      <Suspense fallback={<div className="mt-6 h-60 animate-pulse rounded bg-bg-raised" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Params }) {
  const { id } = await params;
  const userId = (await auth())?.viewer?.id;
  const o = userId ? await getMyOrder(userId, id) : null;
  if (!o) return <p className="mt-10">주문을 찾을 수 없어요</p>;
  return (
    <>
      <h1 className="mt-3 text-2xl font-light">{o.orderName}</h1>
      <p className="mt-1 font-mono text-xs text-muted">{o.id}</p>
      <ul className="mt-8 divide-y divide-line border-y border-line text-sm">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-3">
            <span>
              {i.nameSnapshot} <span className="text-muted">× {i.quantity}</span> <ColorBadge slug={i.productSlug} color={i.color} label={i.colorLabelSnapshot} />
            </span>
            <span className="tabular-nums">{formatPrice(i.priceSnapshotKRW * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm text-muted">합계</span>
        <span className="text-xl text-accent tabular-nums">{formatPrice(o.totalKRW)}</span>
      </div>
      <dl className="mt-10 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <dt className="text-muted">받는 분</dt>
        <dd>{o.recipientName}</dd>
        <dt className="text-muted">연락처</dt>
        <dd>{o.recipientPhone}</dd>
        <dt className="text-muted">주소</dt>
        <dd>{o.recipientAddress}</dd>
        <dt className="text-muted">결제 수단</dt>
        <dd>{o.method ?? "-"}</dd>
        <dt className="text-muted">결제 시각</dt>
        <dd>{dateTime(o.paidAt)}</dd>
      </dl>
      <p className="mt-8 text-xs text-muted">테스트 결제입니다. 실제 배송되지 않아요</p>
    </>
  );
}
