"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeCallbackUrl } from "@/auth-ui/callback";

export function LoginButtons({ kakao, google }: { kakao: boolean; google: boolean }) {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  // 데모 계정 한도(같은 IP 1시간 10개)에 걸리면 Auth.js 가 error=CredentialsSignin 으로 돌려보낸다
  const demoBlocked = params.get("error") === "CredentialsSignin";
  const [busy, setBusy] = useState<string | null>(null);
  const go = (id: string) => {
    setBusy(id);
    void signIn(id, { callbackUrl });
  };
  return (
    <div className="mt-8 grid gap-3">
      <button
        type="button"
        onClick={() => go("demo")}
        disabled={busy !== null}
        className="rounded-full bg-accent py-3 text-sm font-semibold text-bg disabled:opacity-60"
      >
        데모 계정으로 체험하기
      </button>
      {demoBlocked ? (
        <p role="alert" className="text-center text-xs text-accent">
          데모 계정을 짧은 시간에 너무 많이 만들었어요. 한 시간쯤 뒤에 다시 시도하거나 카카오 · 구글로 로그인해 주세요.
        </p>
      ) : (
        <p className="text-center text-xs text-muted">개인 계정 없이 결제 완료까지 둘러볼 수 있어요</p>
      )}
      {(kakao || google) && <div className="my-3 border-t border-line" />}
      {kakao && (
        <button type="button" onClick={() => go("kakao")} disabled={busy !== null} className="rounded-full bg-[#FEE500] py-3 text-sm text-[#191919] disabled:opacity-60">
          카카오로 로그인
        </button>
      )}
      {google && (
        <button type="button" onClick={() => go("google")} disabled={busy !== null} className="rounded-full border border-fg/25 py-3 text-sm disabled:opacity-60">
          구글로 로그인
        </button>
      )}
    </div>
  );
}
