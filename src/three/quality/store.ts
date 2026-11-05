import { create } from "zustand";
import type { FpsWindow } from "./policy";
import type { QualityTier } from "./presets";

export type Backend = "webgpu" | "webgl2" | "none";

type QualityState = {
  tier: QualityTier;
  ceiling: QualityTier;
  adaptive: boolean;
  backend: Backend | null;
  fps: number;
  windows: FpsWindow[];
  /** 최저 품질에서도 너무 느려 3D 를 포기했다 — 이 방문 동안은 모든 페이지가 사진으로 보여 준다 */
  gaveUp: boolean;
  /** ?renderer= 로 렌더러를 정해 왔으면 포기하지 않는다(테스트 · 디버그용) */
  canGiveUp: boolean;
  giveUp: () => void;
  setCanGiveUp: (v: boolean) => void;
  setTier: (tier: QualityTier) => void;
  setCeiling: (ceiling: QualityTier) => void;
  setAdaptive: (adaptive: boolean) => void;
  setBackend: (backend: Backend) => void;
  pushFps: (w: FpsWindow) => void;
};

export const useQuality = create<QualityState>((set) => ({
  tier: 1,
  ceiling: 2,
  adaptive: true,
  backend: null,
  fps: 0,
  windows: [],
  gaveUp: false,
  canGiveUp: true,
  giveUp: () => set({ gaveUp: true, backend: "none" }),
  setCanGiveUp: (canGiveUp) => set({ canGiveUp }),
  setTier: (tier) => set({ tier }),
  setCeiling: (ceiling) => set({ ceiling }),
  setAdaptive: (adaptive) => set({ adaptive }),
  setBackend: (backend) => set({ backend }),
  pushFps: (w) => set((s) => ({ fps: Math.round(w.avgFps), windows: [...s.windows, w].slice(-4) })),
}));
