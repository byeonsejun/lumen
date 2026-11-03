"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

/** 헤더의 로그인 상태. 클라이언트에서 읽어 정적 페이지를 정적으로 둔다 */
export function AccountMenu() {
  const { data, status } = useSession();
  if (status === "loading") return <span className="w-12" aria-hidden />;
  const viewer = data?.viewer;
  if (!viewer) {
    return (
      <Link href="/login" className="hover:text-fg">
        로그인
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-4">
      {viewer.isDemo ? (
        <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[11px] text-accent">데모 계정</span>
      ) : (
        <span className="text-fg/80">{viewer.name}</span>
      )}
      <Link href="/orders" className="hover:text-fg">
        내 주문
      </Link>
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="hover:text-fg">
        로그아웃
      </button>
    </span>
  );
}
