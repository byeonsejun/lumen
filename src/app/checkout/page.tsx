import type { Metadata } from "next";
import { CheckoutView } from "@/checkout/CheckoutView";

export const metadata: Metadata = { title: "주문서 — LUMEN" };

// 로그인 확인은 src/proxy.ts 에서 응답 전에 한다
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-24 sm:px-8">
      <h1 className="mb-8 text-3xl font-light">주문서</h1>
      <CheckoutView />
    </div>
  );
}
