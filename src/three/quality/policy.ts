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

/** 시작 직후 창은 셰이더 컴파일·에셋 로딩으로 느리게 나온다 — 저사양으로 오판하지 않게 버린다 */
export const WARMUP_WINDOWS = 2;
export function acceptWindow(index: number): boolean {
  return index >= WARMUP_WINDOWS;
}

/**
 * 한 번 30fps 아래로 떨어진 단계는 한동안 다시 오르지 않는다.
 * 없으면 GPU 가 약한 기기에서 2단계 25fps → 1단계 60fps → 다시 2단계 … 를 4초마다 되풀이해
 * 그림자 · 해상도가 계속 깜빡였다(저사양 시뮬레이션 측정, docs/perf/lowend.md).
 * 처음엔 15초, 같은 단계가 또 실패하면 두 배씩 늘린다
 */
const BLOCK_BASE_MS = 15_000;
export type TierBlocks = Partial<Record<QualityTier, { until: number; strikes: number }>>;
export const NO_BLOCKS: TierBlocks = {};

export function recordDrop(blocks: TierBlocks, failed: QualityTier, now: number): TierBlocks {
  const strikes = (blocks[failed]?.strikes ?? 0) + 1;
  return { ...blocks, [failed]: { strikes, until: now + BLOCK_BASE_MS * 2 ** (strikes - 1) } };
}

/** 지금 오를 수 있는 가장 높은 단계 — 막힌 단계가 있으면 그 바로 아래에서 멈춘다 */
export function capFor(ceiling: QualityTier, blocks: TierBlocks, now: number): QualityTier {
  for (let t = 1; t <= ceiling; t++) {
    const b = blocks[t as QualityTier];
    if (b && now < b.until) return (t - 1) as QualityTier;
  }
  return ceiling;
}
