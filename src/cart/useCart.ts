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

/**
 * 아직 서버가 받았다고 확인하지 않은 변경 — "이 가구는 N개여야 한다"(0 = 빼기).
 * 담자마자 새로고침하면 진행 중인 요청이 끊긴다. 다음에 열릴 때 이것을 다시 보낸다.
 * 더하기가 아니라 수량 지정이라 서버가 이미 받았더라도 두 번 반영되지 않는다.
 * 사용자 id 와 함께 저장해 다른 계정으로 로그인하면 쓰지 않는다
 */
const PENDING_KEY = "lumen-cart-pending";
type Pending = { uid: string; want: Record<string, number> };
function readPending(uid: string): Record<string, number> {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as Pending | null;
    return p?.uid === uid && p.want && typeof p.want === "object" ? p.want : {};
  } catch {
    return {};
  }
}
function writePending(uid: string, want: Record<string, number>) {
  try {
    if (Object.keys(want).length) localStorage.setItem(PENDING_KEY, JSON.stringify({ uid, want } satisfies Pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // 저장소를 못 쓰면 예전처럼 메모리로만 동작한다
  }
}
/** slug 를 qty 로 맞춰야 한다고 적어 두고, 그 요청이 서버에 닿으면(같은 값일 때만) 지운다 */
function remember(uid: string, slug: string, qty: number): () => void {
  writePending(uid, { ...readPending(uid), [slug]: qty });
  return () => {
    const want = readPending(uid);
    if (want[slug] !== qty) return; // 그 사이 다른 변경이 덮었다
    delete want[slug];
    writePending(uid, want);
  };
}
function replay(want: Record<string, number>) {
  return Object.entries(want).reduce<Promise<unknown>>(
    (prev, [slug, qty]) => prev.then(() => (qty > 0 ? setCartLineAction(slug, qty) : removeCartLineAction(slug))),
    Promise.resolve(),
  );
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
  const { status, data } = useSession();
  const uid = data?.viewer?.id;
  useEffect(() => {
    if (status !== "authenticated") {
      useServerCart.setState({ lines: [], status: "idle" });
      return;
    }
    useServerCart.setState({ status: "syncing" });
    const guest = useGuestCart.getState().lines;
    const pending = uid ? readPending(uid) : {};
    send(async () => {
      if (Object.keys(pending).length) {
        await replay(pending);
        if (uid) writePending(uid, {});
      }
      const r = await (guest.length ? mergeGuestCartAction(guest) : getCartAction());
      if (r.ok && guest.length) useGuestCart.getState().clear();
      return r;
    });
  }, [status, uid]);
  return null;
}

export function useCart() {
  const { status: auth, data } = useSession();
  const signedIn = auth === "authenticated";
  const uid = data?.viewer?.id;
  const guest = useGuestCart();
  const server = useServerCart();
  const lines = signedIn ? server.lines : guest.lines;

  const optimistic = (slug: string, next: CartLine[], call: () => Promise<CartResult>) => {
    useServerCart.setState({ lines: next });
    const done = uid ? remember(uid, slug, next.find((l) => l.slug === slug)?.quantity ?? 0) : null;
    send(async () => {
      const r = await call();
      done?.();
      return r;
    });
  };

  return {
    lines,
    count: cartCount(lines),
    status: signedIn ? (server.status === "synced" ? "synced" : "syncing") : ("guest" as const),
    focused: server.focused,
    lastAdded: server.lastAdded,
    focus: (slug: string | null) => useServerCart.setState({ focused: slug }),
    /**
     * 로그인 여부를 아직 모르는 순간(페이지를 연 직후 0.1~0.3초)에는 담지 않는다.
     * 이때 담으면 로그인 상태인데도 브라우저 장바구니로 들어가고, 뒤이은 합치기가 끊기면
     * 다음 페이지에서 한 번 더 합쳐져 수량이 두 배가 됐다
     */
    ready: auth !== "loading",
    add(slug: string, qty = 1) {
      if (auth === "loading") return;
      useServerCart.setState({ lastAdded: Date.now() });
      if (!signedIn) return guest.add(slug, qty);
      optimistic(slug, addLine(server.lines, slug, qty), () => addToCartAction(slug, qty));
    },
    set(slug: string, qty: number) {
      if (!signedIn) return guest.set(slug, qty);
      optimistic(slug, setLine(server.lines, slug, qty), () => setCartLineAction(slug, qty));
    },
    remove(slug: string) {
      if (!signedIn) return guest.remove(slug);
      optimistic(slug, removeLine(server.lines, slug), () => removeCartLineAction(slug));
    },
  };
}
