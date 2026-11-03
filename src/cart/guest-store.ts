"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addLine, removeLine, setLine, type CartLine } from "./lines";

type GuestCart = {
  lines: CartLine[];
  add: (slug: string, qty?: number) => void;
  set: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

/** 로그인 전 장바구니. 브라우저에만 있다 — 서버를 부르지 않아 정적 페이지가 그대로 빠르다 */
export const useGuestCart = create<GuestCart>()(
  persist(
    (set) => ({
      lines: [],
      add: (slug, qty = 1) => set((s) => ({ lines: addLine(s.lines, slug, qty) })),
      set: (slug, qty) => set((s) => ({ lines: setLine(s.lines, slug, qty) })),
      remove: (slug) => set((s) => ({ lines: removeLine(s.lines, slug) })),
      clear: () => set({ lines: [] }),
    }),
    // localStorage 를 못 쓰는 환경(사생활 보호 모드 등)에서도 메모리로 동작한다
    { name: "lumen-cart", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
