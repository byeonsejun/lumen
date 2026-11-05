import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { googleEnabled, kakaoEnabled } from "@/auth";
import { LoginButtons } from "@/auth-ui/LoginButtons";
import { getProduct } from "@/catalog/query";
import { posterUrl } from "@/three/models";

export const metadata: Metadata = { title: "로그인 — LUMEN" };

// 버튼 하나만 덩그러니 있던 화면 — 쇼룸과 같은 "어둠 속 조명 하나"를 옆에 둔다
const pendant = getProduct("dusk-pendant")!;

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[86svh] max-w-5xl items-center gap-8 px-5 pb-12 pt-20 sm:px-8 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-16 md:pt-24">
      <div
        aria-hidden
        className="relative mx-auto h-44 w-full max-w-xs bg-[radial-gradient(closest-side_at_50%_60%,rgba(232,182,121,0.2),transparent)] md:h-[min(62svh,520px)] md:max-w-none"
      >
        <Image src={posterUrl(pendant.polyhavenId, 640)} alt="" fill sizes="(min-width: 768px) 40vw, 320px" priority className="object-contain object-top p-2 md:p-10" />
      </div>
      <div>
        <h1 className="text-3xl font-light">로그인</h1>
        <p className="mt-2 text-sm text-muted">주문과 결제는 로그인한 뒤에 할 수 있어요. 담아 둔 가구는 그대로 남아요.</p>
        <Suspense fallback={<div className="mt-8 h-12" />}>
          <LoginButtons kakao={kakaoEnabled} google={googleEnabled} />
        </Suspense>
      </div>
    </div>
  );
}
