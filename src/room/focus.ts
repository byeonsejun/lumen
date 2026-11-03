import type { Placement } from "./arrange";

const HEIGHT = 3.4;
const NARROW = 0.4; // 가구 하나를 비출 때의 원뿔 반각
const WIDE_MAX = 1; // 흩어진 가구를 덮더라도 이보다 넓히지 않는다 — 방 전체가 밝아지면 강조가 아니다
const MARGIN = 0.6; // 가구 중심에서 가장자리까지 대략의 여유

export type FocusBeam = { position: [number, number, number]; target: [number, number, number]; angle: number };

/**
 * 목록에서 고른 가구를 비출 조명 하나. 같은 가구가 여러 개면 전부의 가운데를 겨누고
 * 가장 먼 것까지 닿도록 원뿔을 넓힌다. 조명을 여러 개 두지 않는 건 조명 수가 곧 GPU 비용이라서다
 */
export function focusBeam(placements: readonly Placement[], slug: string | null): FocusBeam | null {
  if (!slug) return null;
  const mine = placements.filter((p) => p.slug === slug);
  if (!mine.length) return null;
  const cx = mine.reduce((s, p) => s + p.position[0], 0) / mine.length;
  const cz = mine.reduce((s, p) => s + p.position[2], 0) / mine.length;
  if (mine.length === 1) return { position: [cx, HEIGHT, cz + 0.4], target: [cx, 0, cz], angle: NARROW };
  const spread = Math.max(...mine.map((p) => Math.hypot(p.position[0] - cx, p.position[2] - cz))) + MARGIN;
  const angle = Math.min(Math.max(Math.atan(spread / HEIGHT), NARROW), WIDE_MAX);
  return { position: [cx, HEIGHT, cz], target: [cx, 0, cz], angle };
}
