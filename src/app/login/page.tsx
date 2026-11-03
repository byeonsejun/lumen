import type { Metadata } from "next";
import { Suspense } from "react";
import { googleEnabled, kakaoEnabled } from "@/auth";
import { LoginButtons } from "@/auth-ui/LoginButtons";

export const metadata: Metadata = { title: "로그인 — LUMEN" };

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[80svh] max-w-sm content-center px-5 pt-20">
      <h1 className="text-3xl font-light">로그인</h1>
      <p className="mt-2 text-sm text-muted">주문과 결제는 로그인한 뒤에 할 수 있어요. 담아 둔 가구는 그대로 남아요.</p>
      <Suspense fallback={<div className="mt-8 h-12" />}>
        <LoginButtons kakao={kakaoEnabled} google={googleEnabled} />
      </Suspense>
    </div>
  );
}
