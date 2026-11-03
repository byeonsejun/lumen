"use client";

import { useSearchParams } from "next/navigation";

const REASONS: Record<string, string> = {
  "amount-mismatch": "결제 금액이 주문과 달라 결제를 진행하지 않았어요.",
  "pg-failed": "결제사 승인에 실패했어요. 잠시 뒤 다시 시도해 주세요.",
  "not-found": "주문을 찾을 수 없어요.",
};

export function FailMessage() {
  const q = useSearchParams();
  const text = REASONS[q.get("reason") ?? ""] ?? q.get("message") ?? "결제를 마치지 못했어요.";
  return <p className="mt-3 text-muted">{text}</p>;
}
