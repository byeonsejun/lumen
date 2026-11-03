import type { TossConfirm } from "@/orders/confirm";

/**
 * 토스페이먼츠 결제 승인 — Nextour src/shared/lib/toss/client.ts 에서 승인만 옮겼다(환불 · 웹훅은 2차 범위 밖).
 * 테스트 키(test_sk_…)만 쓴다. Idempotency-Key 를 orderId 로 줘 같은 주문을 두 번 승인하지 않는다
 */
export const tossConfirm: TossConfirm = async ({ paymentKey, orderId, amount }) => {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY 가 없다");
  if (!Number.isInteger(amount)) throw new Error("amount 는 정수여야 한다");
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": orderId,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
    signal: AbortSignal.timeout(8_000),
  });
  const body = (await res.json().catch(() => null)) as { method?: string; approvedAt?: string; code?: string; message?: string } | null;
  if (!res.ok || !body?.approvedAt) throw new Error(`토스 승인 실패 ${res.status} ${body?.code ?? ""} ${body?.message ?? ""}`);
  return { method: body.method ?? "카드", approvedAt: body.approvedAt };
};

/** PAYMENT_SIMULATION=true(로컬 · e2e)일 때 — 결제창 없이 승인된 것으로 */
export const simulatedConfirm: TossConfirm = async () => ({ method: "카드(시뮬레이션)", approvedAt: new Date().toISOString() });

export const paymentSimulation = () => process.env.PAYMENT_SIMULATION === "true" && process.env.VERCEL_ENV !== "production";
