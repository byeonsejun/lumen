import { randomBytes } from "node:crypto";
import { readCart } from "@/cart/repo";
import { orderNameOf, priceLines } from "@/commerce/pricing";
import { db } from "@/server/db";

export type Recipient = { name: string; phone: string; address: string };
export type CreateOrderResult = { orderId: string; amount: number; orderName: string } | { error: "empty-cart" | "invalid-recipient" };

const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** 토스 orderId 겸용 — 6~64자 영숫자 규칙 안, 추측하기 어려운 값 */
function newOrderId(): string {
  return "LM" + Array.from(randomBytes(20), (b) => ALNUM[b % ALNUM.length]).join("");
}

const valid = (s: unknown) => typeof s === "string" && s.trim().length >= 1 && s.trim().length <= 100;

/** 서버 장바구니를 카탈로그 가격으로 다시 계산해 PENDING 주문을 만든다. 브라우저가 보낸 금액은 받지 않는다 */
export async function createOrder(userId: string, recipient: Recipient): Promise<CreateOrderResult> {
  if (!valid(recipient?.name) || !valid(recipient?.phone) || !valid(recipient?.address)) return { error: "invalid-recipient" };
  const { lines, totalKRW } = priceLines(await readCart(userId));
  if (lines.length === 0) return { error: "empty-cart" };
  const orderName = orderNameOf(lines);
  const order = await db().order.create({
    data: {
      id: newOrderId(),
      userId,
      totalKRW,
      orderName,
      recipientName: recipient.name.trim(),
      recipientPhone: recipient.phone.trim(),
      recipientAddress: recipient.address.trim(),
      items: {
        create: lines.map((l) => ({ productSlug: l.slug, color: l.color, colorLabelSnapshot: l.colorLabel ?? null, nameSnapshot: l.name, priceSnapshotKRW: l.unitPriceKRW, quantity: l.quantity })),
      },
    },
    select: { id: true },
  });
  return { orderId: order.id, amount: totalKRW, orderName };
}
