export type ShowroomState =
  | { phase: "intro"; t: number }
  | { phase: "spotlight"; index: number; t: number }
  | { phase: "reveal"; t: number }
  | { phase: "explore" };

export const INTRO = 1;
export const REVEAL = 1.5;
export const EXPLORE = 0.5;

/** 스크롤 진행도(0..1)를 쇼룸 장면으로 바꾼다. 구간 비율 intro 1 · 가구당 1 · reveal 1.5 · explore 0.5 */
export function showroomTimeline(progress: number, count: number): ShowroomState {
  const total = INTRO + count + REVEAL + EXPLORE;
  const x = Math.min(Math.max(progress, 0), 1) * total;
  if (x < INTRO) return { phase: "intro", t: x / INTRO };
  if (x < INTRO + count) {
    const local = x - INTRO;
    const index = Math.floor(local);
    return { phase: "spotlight", index, t: local - index };
  }
  const r = x - INTRO - count;
  if (r < REVEAL) return { phase: "reveal", t: r / REVEAL };
  return { phase: "explore" };
}

export function showroomSegments(count: number): number {
  return INTRO + count + REVEAL + EXPLORE;
}
