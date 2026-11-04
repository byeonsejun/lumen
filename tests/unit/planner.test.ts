import { describe, expect, it } from "vitest";
import { getProduct } from "@/catalog/query";
import type { Placement } from "@/room/arrange";
import {
  arrangeInto,
  clampSize,
  footprint,
  moveTo,
  overlapping,
  placementKey,
  reconcile,
  rotate,
  shrinkRoom,
  surfaceY,
  type RoomSize,
} from "@/room/planner";

const ROOM: RoomSize = { width: 4, depth: 4, height: 2.6 };
const P = (slug: string, x = 0, z = 0, rotationY = 0, extra: Partial<Placement> = {}): Placement => ({
  slug,
  instance: 0,
  position: [x, 0, z],
  rotationY,
  level: "floor",
  ...extra,
});
const item = (slug: string, quantity = 1, color?: string) => ({ product: getProduct(slug)!, quantity, ...(color ? { color } : {}) });

describe("planner", () => {
  it("clampSize — 범위 · 0.1 단위", () => {
    expect(clampSize({ width: 1, depth: 9, height: 4 })).toEqual({ width: 2, depth: 8, height: 3.5 });
    expect(clampSize({ width: 3.14, depth: 4.06, height: 2.56 })).toEqual({ width: 3.1, depth: 4.1, height: 2.6 });
  });

  it("placementKey 는 slug|color#instance", () => {
    expect(placementKey({ slug: "velvet-sofa", instance: 1 })).toBe("velvet-sofa|#1");
    expect(placementKey({ slug: "velvet-sofa", color: "navy", instance: 0 })).toBe("velvet-sofa|navy#0");
  });

  it("footprint — 90° 돌리면 가로 · 깊이가 바뀐다", () => {
    expect(footprint(P("ember-sofa"))).toEqual({ w: 1.807, d: 0.818 });
    const r = footprint(P("ember-sofa", 0, 0, Math.PI / 2));
    expect(r.w).toBeCloseTo(0.818);
    expect(r.d).toBeCloseTo(1.807);
  });

  it("moveTo 는 5cm 로 맞추고 벽 밖으로 못 나간다", () => {
    const m = moveTo(P("ember-sofa"), 0.333, -0.02, ROOM);
    expect(m.position[0]).toBeCloseTo(0.35);
    expect(m.position[2]).toBeCloseTo(0);
    const wall = moveTo(P("ember-sofa"), 3, 3, ROOM);
    expect(wall.position[0]).toBeCloseTo(2 - 1.807 / 2);
    expect(wall.position[2]).toBeCloseTo(2 - 0.818 / 2);
  });

  it("moveTo — 천장 가구는 천장 높이에 매단다", () => {
    const lamp = moveTo(P("dusk-pendant", 0, 0, 0, { level: "ceiling" }), 0, 0, { ...ROOM, height: 3 });
    expect(lamp.position[1]).toBeCloseTo(3 - 0.952);
  });

  it("rotate 90° 면 footprint 가 바뀌고 벽 안으로 다시", () => {
    const near = moveTo(P("ember-sofa"), 0, 3, ROOM); // 뒤가 아니라 앞벽에 붙은 소파
    const r = rotate(near, 1, ROOM);
    expect(r.rotationY).toBeCloseTo(Math.PI / 2);
    expect(r.position[2]).toBeLessThanOrEqual(2 - 1.807 / 2 + 1e-9);
    expect(rotate(rotate(r, -1, ROOM), -1, ROOM).rotationY).toBeCloseTo(-Math.PI / 2);
  });

  it("rotate — 비스듬한 각도는 가까운 90° 로 맞춘 뒤 돌린다", () => expect(rotate(P("halo-lounge-chair", 0, 0, 0.7), 1, ROOM).rotationY).toBeCloseTo(Math.PI / 2));

  it("overlapping — 겹치면 둘 다, 경계만 닿으면 아님, 소품 · 천장은 빼고", () => {
    const a = P("ember-sofa", 0, 0);
    const b = { ...P("halo-lounge-chair", 1.0, 0), instance: 0 };
    expect(overlapping([a, b])).toEqual(new Set(["ember-sofa|#0", "halo-lounge-chair|#0"]));
    const touch = P("halo-lounge-chair", 1.807 / 2 + 0.82 / 2, 0);
    expect(overlapping([a, touch]).size).toBe(0);
    const lamp = P("dusk-pendant", 0, 0, 0, { level: "ceiling" });
    expect(overlapping([a, lamp]).size).toBe(0);
  });

  it("surfaceY — 탁자 위면 탁자 높이, 아니면 바닥", () => {
    const table = P("orbit-coffee-table", 0, 0);
    expect(surfaceY(P("pearl-vase", 0.2, 0.1), [table])).toBeCloseTo(0.491);
    expect(surfaceY(P("pearl-vase", 1.5, 1.5), [table])).toBe(0);
    expect(surfaceY(P("ember-sofa", 0, 0), [table])).toBe(0); // 큰 가구는 올라가지 않는다
  });

  it("arrangeInto — 크기를 늘리지 않고, 다 안 들어가면 남는 건 가운데", () => {
    const ps = arrangeInto([item("cathedral-bed", 3), item("loft-steel-shelf", 2)], { width: 3, depth: 3, height: 2.6 });
    expect(ps).toHaveLength(5);
    expect(ps.some((p) => p.position[0] === 0 && p.position[2] === 0)).toBe(true);
    for (const p of ps) {
      const f = footprint(p);
      expect(Math.abs(p.position[0])).toBeLessThanOrEqual(1.5 - f.w / 2 + 1e-9);
    }
  });

  it("arrangeInto — 천장 가구는 입력한 높이에", () => {
    const ps = arrangeInto([item("dusk-pendant")], { width: 4, depth: 4, height: 3.2 });
    expect(ps[0].position[1]).toBeCloseTo(3.2 - 0.952);
  });

  it("reconcile — 새 가구는 자동 자리 · 사라진 가구는 버림 · 남은 건 저장 위치", () => {
    const saved = [P("ember-sofa", 1.2, -1), P("halo-lounge-chair", 0.5, 0.5)];
    const fresh = [P("ember-sofa", 0, -1.5), P("orbit-coffee-table", 0, 0)];
    expect(reconcile(saved, fresh)).toEqual([saved[0], fresh[1]]);
  });

  it("reconcile — 같은 상품이라도 색이 다르면 다른 가구", () => {
    const saved = [P("velvet-sofa", 1, 1)];
    const fresh = [P("velvet-sofa", 0, 0, 0, { color: "navy" })];
    expect(reconcile(saved, fresh)).toEqual(fresh);
  });

  it("shrinkRoom 은 벽 밖 가구를 안으로", () => {
    const ps = shrinkRoom([P("ember-sofa", 1.0, 1.5)], { width: 2.5, depth: 2.5, height: 2.6 });
    expect(ps[0].position[0]).toBeCloseTo(1.25 - 1.807 / 2);
    expect(ps[0].position[2]).toBeCloseTo(1.25 - 0.818 / 2);
  });
});
