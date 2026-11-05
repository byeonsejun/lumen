"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { NO_BLOCKS, acceptWindow, capFor, nextTier, recordDrop, type TierBlocks } from "./policy";
import { useQuality } from "./store";

const WINDOW_MS = 1000;

/**
 * 실패한 단계 기록 — 품질 단계처럼 페이지를 옮겨도 이어진다(캔버스는 페이지마다 새로 생긴다).
 * 없으면 쇼룸에서 막아 둔 단계를 상세에 들어가자마자 다시 시도했다
 */
const blocks: { current: TierBlocks } = { current: NO_BLOCKS };

/** 1초 창마다 평균 fps 를 재서 품질 단계를 조절한다 */
export function AdaptiveQuality() {
  const acc = useRef({ frames: 0, start: 0, index: 0 });
  useFrame(() => {
    const now = performance.now();
    const a = acc.current;
    if (a.start === 0) a.start = now;
    a.frames += 1;
    const elapsed = now - a.start;
    if (elapsed < WINDOW_MS) return;
    const s = useQuality.getState();
    const avgFps = ((a.frames - 1) * 1000) / elapsed;
    a.frames = 1;
    a.start = now;
    if (!acceptWindow(a.index++)) {
      useQuality.setState({ fps: Math.round(avgFps) }); // HUD 에는 보이되 판단엔 안 쓴다
      return;
    }
    s.pushFps({ avgFps, durationMs: elapsed });
    if (!s.adaptive) return;
    const { windows, tier, ceiling } = useQuality.getState();
    const next = nextTier(tier, windows, capFor(ceiling, blocks.current, now));
    if (next < tier) blocks.current = recordDrop(blocks.current, tier, now);
    if (next !== tier) {
      s.setTier(next);
      useQuality.setState({ windows: [] }); // 단계를 바꾼 뒤엔 새 측정으로 판단한다
    }
  });
  return null;
}
