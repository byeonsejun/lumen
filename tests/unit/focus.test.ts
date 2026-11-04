import { describe, expect, it } from "vitest";
import type { Placement } from "@/room/arrange";
import { focusBeam } from "@/room/focus";

const at = (slug: string, instance: number, x: number, z: number): Placement => ({
  slug,
  instance,
  position: [x, 0, z],
  rotationY: 0,
  level: "floor",
});

describe("focusBeam", () => {
  it("강조할 가구가 없으면 null", () => {
    expect(focusBeam([at("sofa", 0, 0, 0)], null)).toBeNull();
    expect(focusBeam([at("sofa", 0, 0, 0)], "chair|")).toBeNull();
  });

  it("하나면 그 가구를 좁게 비춘다", () => {
    const b = focusBeam([at("sofa", 0, 1, -1)], "sofa|")!;
    expect(b.target).toEqual([1, 0, -1]);
    expect(b.angle).toBeCloseTo(0.4);
  });

  it("같은 가구가 여러 개면 전부를 덮도록 가운데를 겨누고 넓게 비춘다", () => {
    const ps = [at("chair", 0, -1, 0), at("chair", 1, 1, 0), at("table", 0, 0, 0)];
    const b = focusBeam(ps, "chair|")!;
    expect(b.target).toEqual([0, 0, 0]);
    // 원뿔 가장자리가 두 의자 너머까지 닿는다
    const reach = Math.tan(b.angle) * b.position[1];
    expect(reach).toBeGreaterThan(1);
  });

  it("아무리 흩어져 있어도 원뿔은 일정 각도를 넘지 않는다", () => {
    const ps = [at("vase", 0, -5, -5), at("vase", 1, 5, 5)];
    expect(focusBeam(ps, "vase|")!.angle).toBeLessThanOrEqual(1);
  });
  it("같은 상품이라도 색이 다르면 따로 — 열쇠는 slug|color", () => {
    const navy = { ...at("sofa", 0, 2, 0), color: "navy" };
    const b = focusBeam([at("sofa", 0, -2, 0), navy], "sofa|navy")!;
    expect(b.target).toEqual([2, 0, 0]);
  });
});
