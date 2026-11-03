import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FailMessage } from "@/checkout/FailMessage";

export const metadata: Metadata = { title: "결제 실패 — LUMEN" };

export default function CheckoutFailPage() {
  return (
    <div className="mx-auto grid min-h-[70svh] max-w-md content-center px-5 pt-20 text-center">
      <h1 className="text-2xl font-light">결제를 마치지 못했어요</h1>
      <Suspense>
        <FailMessage />
      </Suspense>
      <p className="mt-2 text-sm text-muted">담아 둔 가구는 장바구니에 그대로 있어요.</p>
      <Link href="/cart" className="mx-auto mt-8 rounded-full border border-fg/30 px-5 py-2 text-sm hover:border-accent hover:text-accent">
        장바구니로 돌아가기
      </Link>
    </div>
  );
}
