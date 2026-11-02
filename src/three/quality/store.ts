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
  setTier: (tier) => set({ tier }),
  setCeiling: (ceiling) => set({ ceiling }),
  setAdaptive: (adaptive) => set({ adaptive }),
  setBackend: (backend) => set({ backend }),
  pushFps: (w) => set((s) => ({ fps: Math.round(w.avgFps), windows: [...s.windows, w].slice(-4) })),
}));
