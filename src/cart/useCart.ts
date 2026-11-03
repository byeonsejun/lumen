"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { create } from "zustand";
import {
  addToCartAction,
  getCartAction,
  mergeGuestCartAction,
  removeCartLineAction,
  setCartLineAction,
  type CartResult,
} from "./actions";
import { useGuestCart } from "./guest-store";
import { addLine, cartCount, removeLine, setLine, type CartLine } from "./lines";

type ServerCart = { lines: CartLine[]; status: "idle" | "syncing" | "synced"; focused: string | null; lastAdded: number };
const useServerCart = create<ServerCart>(() => ({ lines: [], status: "idle", focused: null, lastAdded: 0 }));

/**
 * 서버 요청은 나간 순서와 다르게 돌아올 수 있다. 예: 로그인 직후 불러오기(빈 장바구니)가 담기보다 늦게 도착하면
 * 방금 담은 가구를 지워 버린다. 가장 최근에 보낸 요청의 결과만 반영한다
 */
let latest = 0;
function send(call: () => Promise<CartResult>) {
  const mine = ++latest;
  useServerCart.setState({ status: "syncing" });
  void call().then((r) => {
    if (mine === latest) apply(r);
  });
}

function apply(result: CartResult) {
  if (result.ok) {
    useServerCart.setState({ lines: result.lines, status: "synced" });
  } else {
    // JWT 는 살아 있는데 사용자가 정리됨(24시간 지난 데모) — 로그아웃 상태로
    useServerCart.setState({ lines: [], status: "idle" });
    void signOut({ redirect: false });
  }
}

/** 앱에 한 번만 둔다. 로그인되는 순간 브라우저 장바구니를 서버로 합치고, 이후 서버를 기준으로 삼는다 */
export function CartSync() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== "authenticated") {
      useServerCart.setState({ lines: [], status: "idle" });
      return;
    }
    useServerCart.setState({ status: "syncing" });
    const guest = useGuestCart.getState().lines;
    send(async () => {
      const r = await (guest.length ? mergeGuestCartAction(guest) : getCartAction());
      if (r.ok && guest.length) useGuestCart.getState().clear();
      return r;
    });
  }, [status]);
  return null;
}

export function useCart() {
  const { status: auth } = useSession();
  const signedIn = auth === "authenticated";
  const guest = useGuestCart();
  const server = useServerCart();
  const lines = signedIn ? server.lines : guest.lines;

  const optimistic = (next: CartLine[], call: () => Promise<CartResult>) => {
    useServerCart.setState({ lines: next });
    send(call);
  };

  return {
    lines,
    count: cartCount(lines),
    status: signedIn ? (server.status === "synced" ? "synced" : "syncing") : ("guest" as const),
    focused: server.focused,
    lastAdded: server.lastAdded,
    focus: (slug: string | null) => useServerCart.setState({ focused: slug }),
    add(slug: string, qty = 1) {
      useServerCart.setState({ lastAdded: Date.now() });
      if (!signedIn) return guest.add(slug, qty);
      optimistic(addLine(server.lines, slug, qty), () => addToCartAction(slug, qty));
    },
    set(slug: string, qty: number) {
      if (!signedIn) return guest.set(slug, qty);
      optimistic(setLine(server.lines, slug, qty), () => setCartLineAction(slug, qty));
    },
    remove(slug: string) {
      if (!signedIn) return guest.remove(slug);
      optimistic(removeLine(server.lines, slug), () => removeCartLineAction(slug));
    },
  };
}
