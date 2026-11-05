"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addLine, removeLine, setLine, type CartLine } from "./lines";

type GuestCart = {
  lines: CartLine[];
  /**
   * 이 내용을 서버로 합칠 때 붙이는 번호. 합치기 응답이 끊겨 다음에 다시 보내도 같은 번호라 서버가 한 번만 더한다.
   * 내용이 바뀌면 지운다 — 다음 합치기는 새 번호(새 내용)로 간다
   */
  mergeId: string | null;
  mergeIdFor: () => string;
  add: (slug: string, qty?: number, color?: string) => void;
  set: (slug: string, qty: number, color?: string) => void;
  remove: (slug: string, color?: string) => void;
  clear: () => void;
};

function newMergeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** 로그인 전 장바구니. 브라우저에만 있다 — 서버를 부르지 않아 정적 페이지가 그대로 빠르다 */
export const useGuestCart = create<GuestCart>()(
  persist(
    (set, get) => ({
      lines: [],
      mergeId: null,
      mergeIdFor: () => {
        const id = get().mergeId ?? newMergeId();
        set({ mergeId: id });
        return id;
      },
      add: (slug, qty = 1, color = "") => set((s) => ({ lines: addLine(s.lines, slug, qty, color), mergeId: null })),
      set: (slug, qty, color = "") => set((s) => ({ lines: setLine(s.lines, slug, qty, color), mergeId: null })),
      remove: (slug, color = "") => set((s) => ({ lines: removeLine(s.lines, slug, color), mergeId: null })),
      clear: () => set({ lines: [], mergeId: null }),
    }),
    // localStorage 를 못 쓰는 환경(사생활 보호 모드 등)에서도 메모리로 동작한다
    {
      name: "lumen-cart",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({ lines: s.lines, mergeId: s.mergeId }),
    },
  ),
);
