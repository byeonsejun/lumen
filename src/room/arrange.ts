import type { Product } from "@/catalog/types";

/**
 * 장바구니 "내 방" 자동 배치 (스펙 4.3). 순수 함수 — 같은 입력이면 같은 배치.
 * 직접 옮기기는 3차에서 이 결과를 시작 배치로 쓴다.
 *
 * 좌표: 미터, 방 가운데가 원점, 뒷벽 z = -depth/2, 앞(카메라 쪽)이 +z.
 * 모델은 앞면이 +z 를 향한다(rotationY = 0).
 */
export type Placement = {
  slug: string;
  instance: number;
  position: [x: number, y: number, z: number];
  rotationY: number;
  /** floor: 바닥 · ceiling: 천장에 매달림 · surface: 테이블 · 선반 위 */
  level: "floor" | "ceiling" | "surface";
  /** 같은 가구를 4개 넘게 담았을 때 4번째에 붙는 '×N' */
  label?: string;
};
export type RoomLayout = { width: number; depth: number; placements: Placement[] };
type Item = { product: Product; quantity: number };

const START = 4;
const STEP = 0.5;
const MAX = 12;
const MAX_INSTANCES = 4;
const WALL_GAP = 0.05; // 등과 벽 사이
const GAP = 0.1; // 바닥 가구 사이 여유
const SIDE_GAP = 0.3; // 벽을 따라 나란히 놓을 때 간격
const CEILING = 2.6;
const PENDANTS = new Set(["dusk-pendant", "crown-chandelier"]);

type Role = "wall" | "center" | "around" | "ceiling" | "surface" | "corner";
type Instance = { product: Product; instance: number; label?: string; w: number; h: number; d: number; role: Role };
type Rect = { x0: number; x1: number; z0: number; z1: number };

function roleOf(p: Product, w: number): Role {
  if (p.category === "bed" || p.category === "shelves") return "wall";
  if (p.category === "seating") return w >= 1.2 ? "wall" : "around";
  if (p.category === "table") return "center";
  if (p.category === "lighting") return PENDANTS.has(p.slug) ? "ceiling" : "surface";
  if (p.slug === "fern-planter") return "corner";
  return "surface"; // 화병 등 소품
}

function expand(items: Item[]): Instance[] {
  return items.flatMap(({ product, quantity }) => {
    const [w, h, d] = product.dimensionsMm.map((v) => v / 1000);
    const n = Math.min(quantity, MAX_INSTANCES);
    return Array.from({ length: n }, (_, i) => ({
      product,
      instance: i,
      label: quantity > MAX_INSTANCES && i === n - 1 ? `×${quantity}` : undefined,
      w,
      h,
      d,
      role: roleOf(product, w),
    }));
  });
}

const rectAt = (x: number, z: number, fx: number, fz: number): Rect => ({ x0: x - fx / 2, x1: x + fx / 2, z0: z - fz / 2, z1: z + fz / 2 });
const hits = (a: Rect, b: Rect, pad = GAP) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.z0 < b.z1 + pad && b.z0 < a.z1 + pad;

function tryArrange(list: Instance[], W: number, D: number): Placement[] | null {
  const out: Placement[] = [];
  const floor: Rect[] = [];
  const surfaces: { x: number; z: number; y: number; w: number; used: number }[] = [];
  const free = (r: Rect) => r.x0 >= -W / 2 - 1e-9 && r.x1 <= W / 2 + 1e-9 && r.z0 >= -D / 2 - 1e-9 && r.z1 <= D / 2 + 1e-9 && floor.every((f) => !hits(r, f));
  const put = (it: Instance, x: number, y: number, z: number, rotationY: number, level: Placement["level"], rect?: Rect) => {
    out.push({ slug: it.product.slug, instance: it.instance, position: [x, y, z], rotationY, level, ...(it.label ? { label: it.label } : {}) });
    if (rect) floor.push(rect);
  };
  const by = (role: Role) => list.filter((i) => i.role === role);

  // 1. 벽 — 뒷벽에 들어가는 만큼 왼→오로 줄을 세우고 그 줄을 가운데로 모은다. 남은 것은 왼쪽 벽, 오른쪽 벽.
  //    옆벽은 뒤 모서리(0.9m)와 앞쪽(0.6m)을 비운다
  const walls = by("wall");
  const back: Instance[] = [];
  let used = 0;
  for (const it of walls) {
    const next = used + (back.length ? SIDE_GAP : 0) + it.w;
    if (next <= W - 2 * WALL_GAP && back.length === walls.indexOf(it)) {
      back.push(it);
      used = next;
    }
  }
  let backX = -used / 2;
  let leftZ = -D / 2 + 0.9;
  let rightZ = -D / 2 + 0.9;
  for (const it of walls) {
    if (back.includes(it)) {
      const x = backX + it.w / 2;
      const z = -D / 2 + WALL_GAP + it.d / 2;
      put(it, x, 0, z, 0, "floor", rectAt(x, z, it.w, it.d));
      backX += it.w + SIDE_GAP;
    } else if (leftZ + it.w <= D / 2 - 0.6) {
      const x = -W / 2 + WALL_GAP + it.d / 2;
      const z = leftZ + it.w / 2;
      put(it, x, 0, z, Math.PI / 2, "floor", rectAt(x, z, it.d, it.w));
      leftZ += it.w + SIDE_GAP;
    } else if (rightZ + it.w <= D / 2 - 0.6) {
      const x = W / 2 - WALL_GAP - it.d / 2;
      const z = rightZ + it.w / 2;
      put(it, x, 0, z, -Math.PI / 2, "floor", rectAt(x, z, it.d, it.w));
      rightZ += it.w + SIDE_GAP;
    } else return null;
    if (it.product.category === "shelves") surfaces.push({ x: out.at(-1)!.position[0], z: out.at(-1)!.position[2], y: it.h, w: Math.min(it.w, 0.8), used: 0 });
  }

  // 2. 가운데 — 테이블을 나란히. 벽 가구와 겹치면 앞으로 민다
  const tables = by("center");
  const total = tables.reduce((s, t) => s + t.w, 0) + Math.max(tables.length - 1, 0) * 0.4;
  let tx = -total / 2;
  const tableSpots: { x: number; z: number; w: number; d: number; h: number }[] = [];
  for (const it of tables) {
    const x = tx + it.w / 2;
    let z = 0;
    while (!free(rectAt(x, z, it.w, it.d))) {
      z += 0.1;
      if (z + it.d / 2 > D / 2) return null;
    }
    put(it, x, 0, z, 0, "floor", rectAt(x, z, it.w, it.d));
    tableSpots.push({ x, z, w: it.w, d: it.d, h: it.h });
    surfaces.unshift({ x, z, y: it.h, w: Math.min(it.w, 1.0), used: 0 });
    tx += it.w + 0.4;
  }

  // 3. 둘레 — 첫 테이블(없으면 첫 벽 가구, 그것도 없으면 방 가운데) 앞쪽 반원 위, 그쪽을 바라보게.
  //    양옆부터 채운다. 정면(카메라 쪽)부터 앉히면 결제 완료 장면에서 의자 등받이가 테이블을 가린다
  const around = by("around");
  const SIDE_FIRST = [-0.42, 0.42, -0.2, 0.2].map((f) => f * Math.PI);
  const anchor = tableSpots[0] ?? (out[0] ? { x: out[0].position[0], z: out[0].position[2], d: 0.8, w: 1 } : { x: 0, z: -0.5, d: 0, w: 0 });
  around.forEach((it, i) => {
    // 넷까지는 왼쪽 옆 → 오른쪽 옆 → 왼쪽 앞 → 오른쪽 앞, 그보다 많으면 반원에 고르게
    const theta = around.length <= SIDE_FIRST.length ? SIDE_FIRST[i] : -Math.PI / 2 + (Math.PI * (i + 0.5)) / around.length;
    let r = anchor.d / 2 + Math.max(it.w, it.d) / 2 + 0.4;
    for (let tries = 0; tries < 12; tries++, r += 0.2) {
      const x = anchor.x + Math.sin(theta) * r;
      const z = anchor.z + Math.cos(theta) * r;
      const rot = Math.atan2(anchor.x - x, anchor.z - z);
      const side = Math.abs(Math.sin(rot)) > 0.5;
      const rect = rectAt(x, z, side ? it.d : it.w, side ? it.w : it.d);
      if (free(rect)) {
        put(it, x, 0, z, rot, "floor", rect);
        return;
      }
    }
    throw new Full();
  });

  // 4. 천장 — 테이블 위(없으면 방 가운데). 여러 개면 좌우로 0.6m 씩
  by("ceiling").forEach((it, i) => {
    const base = tableSpots[0] ?? { x: 0, z: 0 };
    const offset = i === 0 ? 0 : (i % 2 ? 1 : -1) * 0.6 * Math.ceil(i / 2);
    put(it, base.x + offset, CEILING - it.h, base.z, 0, "ceiling");
  });

  // 5. 위에 놓기 — 테이블 · 선반 상판의 빈 자리, 없으면 구석 바닥
  const corners = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ] as const;
  const toCorner = (it: Instance) => {
    for (const [sx, sz] of corners) {
      const x = sx * (W / 2 - WALL_GAP - it.w / 2);
      const z = sz * (D / 2 - WALL_GAP - it.d / 2);
      const rect = rectAt(x, z, it.w, it.d);
      if (free(rect)) {
        put(it, x, 0, z, 0, "floor", rect);
        return;
      }
    }
    throw new Full();
  };
  for (const it of by("surface")) {
    const s = surfaces.find((sf) => sf.used + it.w <= sf.w);
    if (s) {
      const x = s.x - s.w / 2 + s.used + it.w / 2;
      s.used += it.w + 0.05;
      put(it, x, s.y, s.z, 0, "surface");
    } else toCorner(it);
  }

  // 6. 구석 — 앞쪽 구석부터
  by("corner").forEach(toCorner);
  return out;
}

class Full extends Error {}

export function arrangeRoom(items: Item[]): RoomLayout {
  const list = expand(items);
  if (list.length === 0) return { width: START, depth: START, placements: [] };
  for (let size = START; size <= MAX; size += STEP) {
    try {
      const placements = tryArrange(list, size, size);
      if (placements) return { width: size, depth: size, placements: sortLikeInput(placements, list) };
    } catch (e) {
      if (!(e instanceof Full)) throw e;
    }
  }
  throw new Error("arrangeRoom: 12m 방에도 다 들어가지 않는다");
}

/** 결과는 입력(장바구니) 순서대로 — 목록 ↔ 방 연결이 쉽게 */
function sortLikeInput(placements: Placement[], list: Instance[]): Placement[] {
  const order = new Map(list.map((it, i) => [`${it.product.slug}#${it.instance}`, i]));
  return [...placements].sort((a, b) => order.get(`${a.slug}#${a.instance}`)! - order.get(`${b.slug}#${b.instance}`)!);
}
