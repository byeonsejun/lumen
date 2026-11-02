import type { QualityTier } from "./presets";

export type FpsWindow = { avgFps: number; durationMs: number };

const DOWN_BELOW = 30;
const UP_AT = 58;
/** 이보다 긴 창은 rAF 가 멈췄던 구간(탭 숨김 등)이라 판단에서 뺀다 */
const MAX_WINDOW_MS = 1500;

export function initialTier(gpu: { tier: 0 | 1 | 2 | 3; isMobile: boolean }): QualityTier {
  const byGpu: QualityTier = gpu.tier >= 3 ? 2 : gpu.tier === 2 ? 1 : 0;
  return gpu.isMobile ? (Math.min(byGpu, 1) as QualityTier) : byGpu;
}

export function nextTier(current: QualityTier, recent: FpsWindow[], ceiling: QualityTier): QualityTier {
  const valid = recent.filter((w) => w.durationMs <= MAX_WINDOW_MS);
  const last = valid.at(-1);
  if (!last) return current;
  if (last.avgFps < DOWN_BELOW) return Math.max(current - 1, 0) as QualityTier;
  const lastTwo = valid.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((w) => w.avgFps >= UP_AT)) {
    return Math.min(current + 1, ceiling) as QualityTier;
  }
  return current;
}
