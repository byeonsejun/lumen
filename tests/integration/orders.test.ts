import { beforeEach, describe, expect, it, vi } from "vitest";
import { readCart, writeLine } from "@/cart/repo";
import { createOrder } from "@/orders/create";
import { confirmOrder } from "@/orders/confirm";
import { db } from "@/server/db";
import { createDemoUser } from "@/server/users";
import { track } from "./helpers";

const ok = { name: "변세준", phone: "010-0000-0000", address: "서울시 어딘가 1" };
const fakeToss = () => vi.fn(async () => ({ method: "카드", approvedAt: "2026-11-03T12:00:00+09:00" }));
let u: string;
beforeEach(async () => {
  u = track(await createDemoUser()).id;
});

async function setupOrder(userId: string, lines: [string, number][]) {
  for (const [s, q] of lines) await writeLine(userId, s, q);
  const r = await createOrder(userId, ok);
  if ("error" in r) throw new Error(r.error);
  return r;
}

describe("createOrder", () => {
  it("서버 장바구니를 카탈로그 가격으로 계산해 PENDING 주문과 스냅샷을 만든다", async () => {
    const r = await setupOrder(u, [["ember-sofa", 1], ["orbit-coffee-table", 2]]);
    expect(r.amount).toBe(1_890_000 + 540_000 * 2);
    expect(r.orderName).toBe("Ember 3인 소파 외 1건");
    expect(r.orderId).toMatch(/^LM[0-9A-Za-z]{20}$/);
    const o = await db().order.findUnique({ where: { id: r.orderId }, include: { items: true } });
    expect(o!.status).toBe("PENDING");
    expect(o!.items.map((i) => [i.productSlug, i.nameSnapshot, i.priceSnapshotKRW, i.quantity])).toEqual([
      ["ember-sofa", "Ember 3인 소파", 1_890_000, 1],
      ["orbit-coffee-table", "Orbit 원형 커피 테이블", 540_000, 2],
    ]);
  });
  it("빈 장바구니는 주문을 만들지 않는다", async () => expect(await createOrder(u, ok)).toEqual({ error: "empty-cart" }));
  it("받는 사람 정보가 비면 거절", async () => {
    await writeLine(u, "ember-sofa", 1);
    expect(await createOrder(u, { ...ok, name: " " })).toEqual({ error: "invalid-recipient" });
  });
});

describe("confirmOrder", () => {
  it("금액이 다르면 승인하지 않고 FAILED", async () => {
    const { orderId } = await setupOrder(u, [["ember-sofa", 1]]);
    const toss = fakeToss();
    expect(await confirmOrder(u, { paymentKey: "k", orderId, amount: "1" }, toss)).toEqual({ result: "rejected", reason: "amount-mismatch" });
    expect(toss).not.toHaveBeenCalled();
    expect((await db().order.findUnique({ where: { id: orderId } }))!.status).toBe("FAILED");
  });

  it("두 번 와도 승인은 한 번", async () => {
    const { orderId, amount } = await setupOrder(u, [["ember-sofa", 1]]);
    const toss = fakeToss();
    const p = { paymentKey: "k1", orderId, amount: String(amount) };
    expect(await confirmOrder(u, p, toss)).toEqual({ result: "paid", orderId });
    expect(await confirmOrder(u, p, toss)).toEqual({ result: "already-paid", orderId });
    expect(toss).toHaveBeenCalledTimes(1);
    const o = await db().order.findUnique({ where: { id: orderId } });
    expect([o!.status, o!.paymentKey, o!.method]).toEqual(["PAID", "k1", "카드"]);
    expect(o!.paidAt).toBeInstanceOf(Date);
  });

  it("남의 주문은 not-found", async () => {
    const other = track(await createDemoUser()).id;
    const { orderId, amount } = await setupOrder(other, [["ember-sofa", 1]]);
    expect(await confirmOrder(u, { paymentKey: "k", orderId, amount: String(amount) }, fakeToss())).toEqual({ result: "rejected", reason: "not-found" });
  });

  it("파라미터가 빠지면 not-found", async () =>
    expect(await confirmOrder(u, { paymentKey: null, orderId: null, amount: null }, fakeToss())).toEqual({ result: "rejected", reason: "not-found" }));

  it("승인 뒤 주문한 수량만 장바구니에서 빠진다 (결제 중 다른 탭에서 담은 건 남는다)", async () => {
    const { orderId, amount } = await setupOrder(u, [["ember-sofa", 3]]);
    await writeLine(u, "halo-lounge-chair", 1); // 결제창이 열린 동안 다른 탭에서
    await confirmOrder(u, { paymentKey: "k", orderId, amount: String(amount) }, fakeToss());
    expect(await readCart(u)).toEqual([{ slug: "halo-lounge-chair", quantity: 1 }]);
  });

  it("토스 승인 실패면 pg-failed · FAILED · 장바구니 그대로", async () => {
    const { orderId, amount } = await setupOrder(u, [["ember-sofa", 1]]);
    const toss = vi.fn(async () => {
      throw new Error("REJECT_CARD_COMPANY");
    });
    expect(await confirmOrder(u, { paymentKey: "k", orderId, amount: String(amount) }, toss)).toEqual({ result: "rejected", reason: "pg-failed" });
    expect((await db().order.findUnique({ where: { id: orderId } }))!.status).toBe("FAILED");
    expect(await readCart(u)).toEqual([{ slug: "ember-sofa", quantity: 1 }]);
  });
});
