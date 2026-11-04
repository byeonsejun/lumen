import { getProduct } from "@/catalog/query";
import type { Product } from "@/catalog/types";
import { arrangeRoom, type Placement } from "./arrange";

/** 내 방에 놓아 보기 — 화면과 떼어 둔 배치 계산. 모두 순수 함수다 */

export type RoomSize = { width: number; depth: number; height: number };
export const ROOM_LIMITS = { min: 2, max: 8, minH: 2.2, maxH: 3.5, step: 0.1 } as const;
export const DEFAULT_HEIGHT = 2.6;
const SNAP = 0.05;
const EPS = 1e-6;

const round = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
/** 부동소수점 찌꺼기(0.35000000000000003)를 지운다 */
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

export function clampSize(s: RoomSize): RoomSize {
  const { min, max, minH, maxH, step } = ROOM_LIMITS;
  return {
    width: tidy(round(clamp(s.width, min, max), step)),
    depth: tidy(round(clamp(s.depth, min, max), step)),
    height: tidy(round(clamp(s.height, minH, maxH), step)),
  };
}

export const placementKey = (p: { slug: string; color?: string; instance: number }) => `${p.slug}|${p.color ?? ""}#${p.instance}`;

const dims = (slug: string) => {
  const [w, h, d] = (getProduct(slug)?.dimensionsMm ?? [0, 0, 0]).map((v) => v / 1000);
  return { w, h, d };
};

/** 바닥에서 차지하는 사각형(축에 맞춘 상자). 비스듬한 의자도 다룬다 */
export function footprint(p: Placement): { w: number; d: number } {
  const { w, d } = dims(p.slug);
  const c = Math.abs(Math.cos(p.rotationY));
  const s = Math.abs(Math.sin(p.rotationY));
  return { w: tidy(w * c + d * s), d: tidy(w * s + d * c) };
}

/** 5cm 단위로 맞추고, 바닥 사각형이 벽 안에 들어오게 가둔다. 천장 가구는 천장 높이에 매단다 */
export function moveTo(p: Placement, x: number, z: number, size: RoomSize): Placement {
  const f = footprint(p);
  const mx = Math.max(size.width / 2 - f.w / 2, 0);
  const mz = Math.max(size.depth / 2 - f.d / 2, 0);
  const nx = tidy(clamp(round(x, SNAP), -mx, mx));
  const nz = tidy(clamp(round(z, SNAP), -mz, mz));
  const y = p.level === "ceiling" ? tidy(size.height - dims(p.slug).h) : p.position[1];
  return { ...p, position: [nx, y, nz] };
}

/** 가까운 90° 로 맞춘 뒤 한 칸(±90°) 돌리고, 다시 벽 안에 */
export function rotate(p: Placement, dir: 1 | -1, size: RoomSize): Placement {
  const quarter = Math.round(p.rotationY / (Math.PI / 2)) + dir;
  // -180° ~ 180° 안에서 나타낸다
  const q = ((((quarter + 2) % 4) + 4) % 4) - 2;
  return moveTo({ ...p, rotationY: (q * Math.PI) / 2 }, p.position[0], p.position[2], size);
}

/** 탁자 · 선반 위에 올라가는 작은 것 (화병 · 캔들 홀더) */
const isSmall = (p: Product | undefined) => !!p && (p.category === "decor" || (p.category === "lighting" && p.slug === "brass-candleholders")) && p.slug !== "fern-planter";
const isTop = (p: Product | undefined) => !!p && (p.category === "table" || p.category === "shelves");

/** 바닥 가구끼리 바닥 사각형이 겹치는 것들의 placementKey. 경계만 닿으면 겹침이 아니다 */
export function overlapping(ps: Placement[]): Set<string> {
  const floor = ps.filter((p) => p.level === "floor" && !isSmall(getProduct(p.slug)));
  const out = new Set<string>();
  for (let i = 0; i < floor.length; i++)
    for (let j = i + 1; j < floor.length; j++) {
      const a = floor[i], b = floor[j];
      const fa = footprint(a), fb = footprint(b);
      const ox = (fa.w + fb.w) / 2 - Math.abs(a.position[0] - b.position[0]);
      const oz = (fa.d + fb.d) / 2 - Math.abs(a.position[2] - b.position[2]);
      if (ox > EPS && oz > EPS) {
        out.add(placementKey(a));
        out.add(placementKey(b));
      }
    }
  return out;
}

/** 작은 소품이 탁자 · 선반 바닥 사각형 안에 있으면 그 높이, 아니면 바닥(0) */
export function surfaceY(p: Placement, ps: Placement[]): number {
  if (!isSmall(getProduct(p.slug))) return 0;
  const under = ps.find((t) => {
    if (t === p || !isTop(getProduct(t.slug))) return false;
    const f = footprint(t);
    return Math.abs(p.position[0] - t.position[0]) <= f.w / 2 && Math.abs(p.position[2] - t.position[2]) <= f.d / 2;
  });
  return under ? dims(under.slug).h : 0;
}

type Item = { product: Product; quantity: number; color?: string };

/** 입력한 방 크기 안에서 자동 배치. 크기를 늘리지 않고, 못 놓은 가구는 가운데 */
export function arrangeInto(items: Item[], size: RoomSize): Placement[] {
  return arrangeRoom(items, size).placements;
}

/** 장바구니가 바뀌었을 때 — 새 배치(fresh) 기준으로, 저장된 가구는 저장된 자리를, 새 가구는 자동 자리를 쓴다 */
export function reconcile(saved: Placement[], fresh: Placement[]): Placement[] {
  const byKey = new Map(saved.map((p) => [placementKey(p), p]));
  return fresh.map((f) => byKey.get(placementKey(f)) ?? f);
}

/** 방 크기를 바꾸면 모든 가구를 다시 벽 안에 가두고 천장 높이를 맞춘다 */
export function shrinkRoom(ps: Placement[], size: RoomSize): Placement[] {
  return ps.map((p) => moveTo(p, p.position[0], p.position[2], size));
}
