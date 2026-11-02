"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { nextTier } from "./policy";
import { useQuality } from "./store";

const WINDOW_MS = 1000;

/** 1초 창마다 평균 fps 를 재서 품질 단계를 조절한다 */
export function AdaptiveQuality() {
  const acc = useRef({ frames: 0, start: 0 });
  useFrame(() => {
    const now = performance.now();
    const a = acc.current;
    if (a.start === 0) a.start = now;
    a.frames += 1;
    const elapsed = now - a.start;
    if (elapsed < WINDOW_MS) return;
    const s = useQuality.getState();
    s.pushFps({ avgFps: ((a.frames - 1) * 1000) / elapsed, durationMs: elapsed });
    a.frames = 1;
    a.start = now;
    if (!s.adaptive) return;
    const { windows, tier, ceiling } = useQuality.getState();
    const next = nextTier(tier, windows, ceiling);
    if (next !== tier) {
      s.setTier(next);
      useQuality.setState({ windows: [] }); // 단계를 바꾼 뒤엔 새 측정으로 판단한다
    }
  });
  return null;
}
