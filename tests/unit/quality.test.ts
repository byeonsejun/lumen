import { describe, expect, it } from "vitest";
import { NO_BLOCKS, capFor, initialTier, nextTier, recordDrop } from "@/three/quality/policy";
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

describe("한 번 실패한 단계로 바로 돌아가지 않는다 (오르내림 방지)", () => {
  it("내려온 단계는 15초 동안 다시 오르지 않는다", () => {
    const b = recordDrop(NO_BLOCKS, 2, 1_000);
    expect(capFor(2, b, 10_000)).toBe(1);
    expect(capFor(2, b, 16_000)).toBe(2);
  });

  it("같은 단계에서 또 실패하면 기다리는 시간이 두 배씩 늘어난다", () => {
    let b = recordDrop(NO_BLOCKS, 2, 0); // 15초
    b = recordDrop(b, 2, 20_000); // 30초
    expect(capFor(2, b, 45_000)).toBe(1);
    expect(capFor(2, b, 50_001)).toBe(2);
    b = recordDrop(b, 2, 60_000); // 60초
    expect(capFor(2, b, 110_000)).toBe(1);
  });

  it("아래 단계까지 실패하면 그 아래로 막는다 — 막힌 단계를 건너뛰어 오르지 않는다", () => {
    let b = recordDrop(NO_BLOCKS, 2, 0);
    b = recordDrop(b, 1, 5_000);
    expect(capFor(2, b, 10_000)).toBe(0);
    expect(capFor(2, b, 17_000)).toBe(0); // 2 는 풀렸어도 1 이 아직(20초까지) — 건너뛰어 오르지 않는다
    expect(capFor(2, b, 21_000)).toBe(2);
  });

  it("기기가 정해 준 ceiling 보다 위로는 여전히 못 간다", () => {
    expect(capFor(1, NO_BLOCKS, 0)).toBe(1);
  });

  it("측정 그대로 흉내 — 1단계에서 빨라도 막힌 2단계로는 안 오른다", () => {
    const b = recordDrop(NO_BLOCKS, 2, 0);
    expect(nextTier(1, [w(60), w(60)], capFor(2, b, 5_000))).toBe(1);
  });
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
