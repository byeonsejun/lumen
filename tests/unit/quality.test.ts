import { describe, expect, it } from "vitest";
import { initialTier, nextTier } from "@/three/quality/policy";
import { QUALITY_PRESETS } from "@/three/quality/presets";

const w = (avgFps: number, durationMs = 1000) => ({ avgFps, durationMs });

describe("initialTier", () => {
  it("GPU 등급 3 데스크톱은 high", () => expect(initialTier({ tier: 3, isMobile: false })).toBe(2));
  it("GPU 등급 2 는 mid", () => expect(initialTier({ tier: 2, isMobile: false })).toBe(1));
  it("모바일은 최대 mid", () => expect(initialTier({ tier: 3, isMobile: true })).toBe(1));
  it("등급 0·1 은 low", () => {
    expect(initialTier({ tier: 0, isMobile: false })).toBe(0);
    expect(initialTier({ tier: 1, isMobile: false })).toBe(0);
  });
});

describe("nextTier", () => {
  it("30fps 미만이면 내린다", () => expect(nextTier(2, [w(24)], 2)).toBe(1));
  it("0 아래로 안 내린다", () => expect(nextTier(0, [w(10)], 2)).toBe(0));
  it("두 창 연속 58 이상이면 올린다", () => expect(nextTier(0, [w(60), w(59)], 2)).toBe(1));
  it("한 창만 빠르면 그대로", () => expect(nextTier(0, [w(40), w(60)], 2)).toBe(0));
  it("ceiling 위로 안 올린다", () => expect(nextTier(1, [w(60), w(60)], 1)).toBe(1));
  it("탭 숨김 같은 긴 창은 무시한다", () => expect(nextTier(2, [w(2, 9000)], 2)).toBe(2));
  it("창이 없으면 그대로", () => expect(nextTier(1, [], 2)).toBe(1));
});

describe("QUALITY_PRESETS", () => {
  it("low 는 그림자·후처리 없이 1k", () =>
    expect(QUALITY_PRESETS[0]).toEqual({ dpr: [1, 1], shadows: false, shadowMapSize: 512, bloom: false, ao: false, assetRes: "1k" }));
  it("high 는 2k 와 AO", () => expect(QUALITY_PRESETS[2]).toMatchObject({ dpr: [1, 2], ao: true, assetRes: "2k", shadowMapSize: 2048 }));
});

describe("acceptWindow", () => {
  it("시작 직후 두 창(셰이더 컴파일·에셋 로딩)은 판단에 쓰지 않는다", async () => {
    const { acceptWindow } = await import("@/three/quality/policy");
    expect([0, 1, 2, 3].map(acceptWindow)).toEqual([false, false, true, true]);
  });
});
