import { describe, expect, it } from "vitest";
import { getProduct, getProducts } from "@/catalog/query";
import { arrangeRoom, type RoomLayout } from "@/room/arrange";

const P = (slug: string, quantity = 1) => ({ product: getProduct(slug)!, quantity });

/** 바닥에 놓인 가구끼리 바닥 사각형(회전 반영)이 겹치는 쌍 */
function floorOverlaps(r: RoomLayout): string[] {
  const rects = r.placements
    .filter((p) => p.level === "floor")
    .map((p) => {
      const [w, , d] = getProduct(p.slug)!.dimensionsMm.map((v) => v / 1000);
      const side = Math.abs(Math.sin(p.rotationY)) > 0.5;
      const [fx, fz] = side ? [d, w] : [w, d];
      return { id: `${p.slug}#${p.instance}`, x0: p.position[0] - fx / 2, x1: p.position[0] + fx / 2, z0: p.position[2] - fz / 2, z1: p.position[2] + fz / 2 };
    });
  const out: string[] = [];
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6) out.push(`${a.id}×${b.id}`);
    }
  return out;
}

/** 바닥 가구가 방 안에 들어 있는지 */
function outside(r: RoomLayout): string[] {
  return r.placements
    .filter((p) => p.level === "floor")
    .filter((p) => Math.abs(p.position[0]) > r.width / 2 || Math.abs(p.position[2]) > r.depth / 2)
    .map((p) => p.slug);
}

describe("arrangeRoom", () => {
  it("같은 입력은 같은 배치", () => expect(arrangeRoom([P("ember-sofa"), P("orbit-coffee-table")])).toEqual(arrangeRoom([P("ember-sofa"), P("orbit-coffee-table")])));

  it("빈 장바구니는 빈 4×4 방", () => expect(arrangeRoom([])).toEqual({ width: 4, depth: 4, placements: [] }));

  it("소파는 뒷벽에 등을 붙인다", () => {
    const r = arrangeRoom([P("ember-sofa")]);
    const s = r.placements[0];
    expect(s.rotationY).toBe(0);
    expect(s.position[2]).toBeCloseTo(-r.depth / 2 + 0.05 + 0.818 / 2, 2); // 깊이 818mm
  });

  it("뒷벽 가구들은 줄째로 가운데에 모인다", () => {
    expect(arrangeRoom([P("ember-sofa")]).placements[0].position[0]).toBeCloseTo(0, 5);
    const two = arrangeRoom([P("ember-sofa"), P("grid-shelf")]).placements.map((p) => p.position[0]);
    expect(two[0] + two[1]).toBeLessThan(two[1] - two[0]); // 대략 좌우 대칭
    expect(Math.abs((two[0] - 1.807 / 2) + (two[1] + 1.078 / 2))).toBeLessThan(0.01); // 줄의 왼끝과 오른끝이 원점 기준 대칭
  });

  it("테이블은 가운데", () => expect(arrangeRoom([P("orbit-coffee-table")]).placements[0].position).toEqual([0, 0, 0]));

  it("의자는 테이블 옆에서 테이블을 바라본다 — 정면 구도에서 테이블을 가리지 않게", () => {
    const r = arrangeRoom([P("orbit-coffee-table"), P("halo-lounge-chair")]);
    const c = r.placements.find((p) => p.slug === "halo-lounge-chair")!;
    const t = r.placements.find((p) => p.slug === "orbit-coffee-table")!;
    // 의자 중심이 테이블 반지름(Orbit 지름 1.3m) 바깥 — 정면에서 보면 테이블 옆에 있다
    expect(Math.abs(c.position[0] - t.position[0])).toBeGreaterThan(0.9);
    // 의자 앞(+z)을 회전시킨 방향이 테이블(원점)을 향한다
    const fx = Math.sin(c.rotationY), fz = Math.cos(c.rotationY);
    const tx = -c.position[0], tz = -c.position[2];
    expect((fx * tx + fz * tz) / Math.hypot(tx, tz)).toBeGreaterThan(0.95);
  });

  it("바닥 가구끼리 겹치지 않고 방 안에 있다 (소품 빼고 전부)", () => {
    const r = arrangeRoom(getProducts().filter((p) => p.category !== "decor").map((p) => P(p.slug)));
    expect(floorOverlaps(r)).toEqual([]);
    expect(outside(r)).toEqual([]);
  });

  it("의자 둘은 테이블 양옆에 마주 놓인다", () => {
    const r = arrangeRoom([P("orbit-coffee-table"), P("halo-lounge-chair", 2)]);
    const [a, b] = r.placements.filter((p) => p.slug === "halo-lounge-chair");
    expect(Math.sign(a.position[0])).toBe(-Math.sign(b.position[0]));
  });

  it("자리가 모자라면 방이 넓어진다", () => {
    const r = arrangeRoom(["ember-sofa", "velvet-sofa", "siesta-daybed", "cathedral-bed", "grid-shelf", "loft-steel-shelf"].map((s) => P(s)));
    expect(r.width).toBeGreaterThan(4);
    expect(floorOverlaps(r)).toEqual([]);
  });

  it("4 개 넘게 담으면 4 개만 놓고 4 번째에 ×N", () => {
    const r = arrangeRoom([P("moss-chair", 6)]);
    expect(r.placements).toHaveLength(4);
    expect(r.placements[3].label).toBe("×6");
    expect(r.placements.slice(0, 3).every((p) => p.label === undefined)).toBe(true);
  });

  it("펜던트는 테이블 위 천장", () => {
    const r = arrangeRoom([P("orbit-coffee-table"), P("dusk-pendant")]);
    const l = r.placements.find((p) => p.slug === "dusk-pendant")!;
    expect(l.level).toBe("ceiling");
    expect(l.position[0]).toBeCloseTo(0, 5);
    expect(l.position[1]).toBeGreaterThan(1.5);
  });

  it("화병은 테이블 위", () => {
    const r = arrangeRoom([P("orbit-coffee-table"), P("pearl-vase")]);
    const v = r.placements.find((p) => p.slug === "pearl-vase")!;
    expect(v.level).toBe("surface");
    expect(v.position[1]).toBeCloseTo(0.491, 2);
  });

  it("올려 둘 곳이 없으면 화병은 바닥 구석", () => {
    const v = arrangeRoom([P("pearl-vase")]).placements[0];
    expect(v.level).toBe("floor");
    expect(Math.abs(v.position[0])).toBeGreaterThan(1.5);
  });

  it("화분은 구석", () => {
    const f = arrangeRoom([P("fern-planter")]).placements[0];
    expect(Math.abs(f.position[0])).toBeGreaterThan(1.4);
    expect(Math.abs(f.position[2])).toBeGreaterThan(1.4);
  });

  it("인스턴스 번호는 상품마다 0 부터", () => {
    const r = arrangeRoom([P("moss-chair", 2)]);
    expect(r.placements.map((p) => p.instance)).toEqual([0, 1]);
  });
  it("같은 상품 다른 색은 따로 놓이고 색을 기억한다", () => {
    const sofa = getProduct("velvet-sofa")!;
    const r = arrangeRoom([{ product: sofa, quantity: 1 }, { product: sofa, quantity: 1, color: "navy" }]);
    const mine = r.placements.filter((p) => p.slug === "velvet-sofa");
    expect(mine.map((p) => [p.color ?? "", p.instance])).toEqual([["", 0], ["navy", 0]]);
    expect(mine[0].position).not.toEqual(mine[1].position);
  });
});
