"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useState } from "react";
import type { Recipient } from "@/orders/create";
import { startPaymentAction } from "@/orders/actions";

const MESSAGES: Record<string, string> = {
  "empty-cart": "장바구니가 비어 있어요",
  "invalid-recipient": "받는 분 · 연락처 · 주소를 모두 적어 주세요",
  "signed-out": "다시 로그인해 주세요",
};

/** 결제 시작. SDK 로드 · 결제창 호출은 클릭 안에서만 한다 */
export function PayButton({ recipient, amountLabel }: { recipient: Recipient; amountLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await startPaymentAction(recipient);
    if ("error" in r) {
      setError(MESSAGES[r.error] ?? "결제를 시작하지 못했어요");
      setBusy(false);
      return;
    }
    const origin = window.location.origin;
    if (r.simulation) {
      // 로컬 · e2e: 결제창 없이 토스가 successUrl 로 넘겨주는 것과 같은 모양으로 이동
      const q = new URLSearchParams({ paymentKey: `sim_${Date.now()}`, orderId: r.orderId, amount: String(r.amount) });
      // /checkout/success 는 페이지가 아니라 Route Handler 라 전체 이동이 맞다(router.push 로는 RSC 요청이 된다)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/checkout/success?${q}`);
      return;
    }
    try {
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "");
      await toss.payment({ customerKey: r.customerKey! }).requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: r.amount },
        orderId: r.orderId,
        orderName: r.orderName,
        customerName: recipient.name,
        successUrl: `${origin}/checkout/success`,
        failUrl: `${origin}/checkout/fail`,
      });
    } catch (e) {
      // 결제창을 닫으면 여기로 온다. 주문은 PENDING 으로 남고 장바구니는 그대로
      setError(e instanceof Error ? e.message : "결제를 진행하지 못했어요");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-bg hover:brightness-110 disabled:opacity-60">
        {busy ? "결제 준비 중…" : `${amountLabel} 결제하기`}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
