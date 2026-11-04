"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Placement } from "./arrange";
import type { RoomSize } from "./planner";

type RoomState = {
  /** 입력한 방 크기. null 이면 아직 안 정했다 — 자동 배치 크기로 시작한다 */
  size: RoomSize | null;
  /** 사용자가 옮기거나 돌린 배치. 장바구니와는 화면이 맞춘다(reconcile) */
  placements: Placement[];
  selected: string | null;
  topView: boolean;
  setSize: (size: RoomSize) => void;
  setPlacements: (ps: Placement[]) => void;
  select: (key: string | null) => void;
  toggleTopView: () => void;
  reset: () => void;
};

/** 내 방 배치 — 브라우저에만 저장한다(서버에 안 보낸다). localStorage 를 못 쓰면 메모리로 동작 */
export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      size: null,
      placements: [],
      selected: null,
      topView: false,
      setSize: (size) => set({ size }),
      setPlacements: (placements) => set({ placements }),
      select: (selected) => set({ selected }),
      toggleTopView: () => set((s) => ({ topView: !s.topView })),
      reset: () => set({ placements: [], selected: null }),
    }),
    {
      name: "lumen-room",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ size: s.size, placements: s.placements }),
    },
  ),
);
