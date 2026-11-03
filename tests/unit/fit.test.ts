import { describe, expect, it } from "vitest";
import { fitTransform } from "@/three/fit";

describe("fitTransform — 모델 크기 · 방향을 상품 치수에 맞춘다", () => {
  it("치수와 맞는 모델은 그대로", () => expect(fitTransform({ x: 1.81, y: 0.71, z: 0.82 }, [1807, 709, 818])).toEqual({ scale: 1, rotateY: 0 }));
  it("단위가 10배인 모델은 줄인다 (Loft 스틸 선반)", () => {
    const f = fitTransform({ x: 10.97, y: 21.41, z: 5.02 }, [1097, 2141, 502]);
    expect(f.scale).toBeCloseTo(0.1, 2);
    expect(f.rotateY).toBe(0);
  });
  it("옆면이 앞을 보는 모델은 90° 돌린다 (Grid 수납 선반)", () => {
    const f = fitTransform({ x: 0.37, y: 1.56, z: 1.08 }, [1078, 1556, 372]);
    expect(f.scale).toBeCloseTo(1, 2);
    expect(Math.abs(f.rotateY)).toBeCloseTo(Math.PI / 2, 5);
  });
  it("정사각 바닥은 돌리지 않는다", () => expect(fitTransform({ x: 1.3, y: 0.49, z: 1.3 }, [1301, 491, 1301]).rotateY).toBe(0));
  it("작은 오차(±10%)는 1 로 둔다", () => expect(fitTransform({ x: 0.67, y: 1.0, z: 0.66 }, [673, 1059, 664]).scale).toBe(1));
});
