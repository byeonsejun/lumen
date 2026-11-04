import { subtractOrdered } from "@/cart/repo";
import { amountMatches } from "@/commerce/pricing";
import { db } from "@/server/db";

export type TossConfirm = (args: { paymentKey: string; orderId: string; amount: number }) => Promise<{ method: string; approvedAt: string }>;
export type ConfirmResult =
  | { result: "paid" | "already-paid"; orderId: string }
  | { result: "rejected"; reason: "not-found" | "amount-mismatch" | "pg-failed" };

/**
 * 토스 successUrl 로 돌아왔을 때 서버가 승인한다.
 * - 내 주문이 아니거나 파라미터가 없으면 not-found
 * - 금액이 저장된 합계와 다르면 승인하지 않고 FAILED (브라우저에서 금액을 바꾼 경우)
 * - 이미 PAID 면 승인을 다시 부르지 않는다 (새로고침 · 뒤로 가기)
 * - 성공하면 PAID 로 바꾸고 주문한 수량만큼만 장바구니에서 뺀다
 */
export async function confirmOrder(
  userId: string,
  params: { paymentKey: string | null; orderId: string | null; amount: string | null },
  toss: TossConfirm,
): Promise<ConfirmResult> {
  const { paymentKey, orderId, amount } = params;
  if (!paymentKey || !orderId) return { result: "rejected", reason: "not-found" };
  const order = await db().order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
  if (!order) return { result: "rejected", reason: "not-found" };
  if (order.status === "PAID") return { result: "already-paid", orderId };
  if (!amountMatches(order.totalKRW, amount)) {
    await db().order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "FAILED" } });
    return { result: "rejected", reason: "amount-mismatch" };
  }
  let approved: { method: string; approvedAt: string };
  try {
    approved = await toss({ paymentKey, orderId, amount: order.totalKRW });
  } catch (e) {
    console.warn("[confirmOrder] 토스 승인 실패", orderId, e);
    await db().order.updateMany({ where: { id: orderId, status: { not: "PAID" } }, data: { status: "FAILED" } });
    return { result: "rejected", reason: "pg-failed" };
  }
  const { count } = await db().order.updateMany({
    where: { id: orderId, status: { not: "PAID" } },
    data: { status: "PAID", paymentKey, method: approved.method, paidAt: new Date(approved.approvedAt) },
  });
  // 동시에 두 번 들어와 다른 쪽이 먼저 PAID 로 바꿨다면 장바구니는 그쪽이 이미 뺐다
  if (count === 0) return { result: "already-paid", orderId };
  await subtractOrdered(userId, order.items.map((i) => ({ slug: i.productSlug, quantity: i.quantity, ...(i.color ? { color: i.color } : {}) })));
  return { result: "paid", orderId };
}
