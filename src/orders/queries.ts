import { db } from "@/server/db";

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof getMyOrder>>>;

/** 내 주문 하나(상태 무관). 남의 주문이면 null */
export async function getMyOrder(userId: string, orderId: string) {
  return db().order.findFirst({ where: { id: orderId, userId }, include: { items: { orderBy: { id: "asc" } } } });
}

/** 주문 내역 — 결제 완료만, 최신순 */
export async function listMyPaidOrders(userId: string) {
  return db().order.findMany({
    where: { userId, status: "PAID" },
    orderBy: { paidAt: "desc" },
    select: { id: true, orderName: true, totalKRW: true, paidAt: true },
  });
}
