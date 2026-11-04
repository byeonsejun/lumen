"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { NAV_ITEM } from "./nav-item";

/** 헤더의 로그인 상태. 클라이언트에서 읽어 정적 페이지를 정적으로 둔다 */
export function AccountMenu() {
  const { data, status } = useSession();
  if (status === "loading") return <span className="w-11" aria-hidden />;
  const viewer = data?.viewer;
  if (!viewer) {
    return (
      <Link href="/login" className={NAV_ITEM}>
        로그인
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-1 sm:gap-4">
      {/* 휴대폰은 폭이 모자라 누구로 로그인했는지는 넓은 화면에서만 보인다 */}
      {viewer.isDemo ? (
        <span className="hidden whitespace-nowrap rounded-full border border-accent/50 px-2 py-0.5 text-[11px] text-accent sm:inline">데모 계정</span>
      ) : (
        <span className="hidden whitespace-nowrap text-fg/80 sm:inline">{viewer.name}</span>
      )}
      <Link href="/orders" className={NAV_ITEM}>
        내 주문
      </Link>
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={NAV_ITEM}>
        로그아웃
      </button>
    </span>
  );
}
