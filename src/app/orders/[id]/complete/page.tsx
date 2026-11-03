import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { getMyOrder } from "@/orders/queries";
import { CompleteView } from "@/orders/ui/CompleteView";

export const metadata: Metadata = { title: "주문 완료 — LUMEN" };

type Params = Promise<{ id: string }>;

// 로그인 · 주인 확인(404)은 src/proxy.ts 에서 응답 전에 한다
export default function OrderCompletePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-svh" />}>
      <Complete params={params} />
    </Suspense>
  );
}

async function Complete({ params }: { params: Params }) {
  const { id } = await params;
  const userId = (await auth())?.viewer?.id;
  const order = userId ? await getMyOrder(userId, id) : null;
  if (!order || order.status !== "PAID" || !order.paidAt) redirect("/checkout/fail?reason=not-found");
  return (
    <CompleteView
      orderId={order.id}
      totalKRW={order.totalKRW}
      paidAt={order.paidAt.toISOString()}
      items={order.items.map((i) => ({ slug: i.productSlug, quantity: i.quantity }))}
    />
  );
}
