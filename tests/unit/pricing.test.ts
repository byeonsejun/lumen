import { describe, expect, it } from "vitest";
import { amountMatches, orderNameOf, priceLines } from "@/commerce/pricing";

describe("priceLines", () => {
  it("카탈로그 가격으로 합계", () => expect(priceLines([{ slug: "ember-sofa", quantity: 2 }]).totalKRW).toBe(3_780_000));
  it("모르는 slug 는 버린다", () => expect(priceLines([{ slug: "nope", quantity: 1 }]).lines).toEqual([]));
  it("수량 clamp · 중복 합침", () =>
    expect(priceLines([{ slug: "ember-sofa", quantity: 7 }, { slug: "ember-sofa", quantity: 5 }]).lines[0].quantity).toBe(9));
  it("0 · 음수 · 소수는 1 이상 정수로", () => {
    expect(priceLines([{ slug: "ember-sofa", quantity: 0 }]).lines[0].quantity).toBe(1);
    expect(priceLines([{ slug: "ember-sofa", quantity: -3 }]).lines[0].quantity).toBe(1);
    expect(priceLines([{ slug: "ember-sofa", quantity: 2.7 }]).lines[0].quantity).toBe(2);
  });
  it("줄마다 단가 · 소계", () =>
    expect(priceLines([{ slug: "orbit-coffee-table", quantity: 3 }]).lines[0]).toEqual({
      slug: "orbit-coffee-table", color: "", name: "Orbit 원형 커피 테이블", unitPriceKRW: 540_000, quantity: 3, subtotalKRW: 1_620_000,
    }));
});

describe("priceLines 색", () => {
  it("색이 달라도 가격은 같고 줄은 둘", () => {
    const { lines, totalKRW } = priceLines([{ slug: "velvet-sofa", quantity: 1, color: "navy" }, { slug: "velvet-sofa", quantity: 1 }]);
    expect(lines).toHaveLength(2);
    expect(totalKRW).toBe(lines[0].unitPriceKRW * 2);
    expect(lines.find((l) => l.color === "navy")?.colorLabel).toBe("네이비");
    expect(lines.find((l) => l.color === "")?.colorLabel).toBeUndefined();
  });
  it("모르는 색은 원래 색 줄로 합친다", () =>
    expect(priceLines([{ slug: "velvet-sofa", quantity: 1, color: "rainbow" }, { slug: "velvet-sofa", quantity: 1 }]).lines).toHaveLength(1));
});

describe("orderNameOf", () => {
  it("여러 개면 '외 N건'", () =>
    expect(orderNameOf(priceLines([{ slug: "ember-sofa", quantity: 1 }, { slug: "orbit-coffee-table", quantity: 1 }, { slug: "fern-planter", quantity: 3 }]).lines)).toBe("Ember 3인 소파 외 2건"));
  it("하나면 이름만", () => expect(orderNameOf(priceLines([{ slug: "ember-sofa", quantity: 2 }]).lines)).toBe("Ember 3인 소파"));
});

describe("amountMatches", () => {
  it("정확 일치만", () => {
    expect(amountMatches(540000, "540000")).toBe(true);
    expect(amountMatches(540000, 540000)).toBe(true);
    expect(amountMatches(540000, "540000.0")).toBe(false);
    expect(amountMatches(540000, " 540000")).toBe(false);
    expect(amountMatches(540000, "1")).toBe(false);
    expect(amountMatches(540000, null)).toBe(false);
  });
});
