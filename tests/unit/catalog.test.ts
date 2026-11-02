import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, formatPrice, getFeatured, getProduct, getProducts } from "@/catalog/query";

describe("catalog", () => {
  it("모르는 카테고리는 전체를 준다", () => expect(getProducts("nope")).toEqual(getProducts()));
  it("카테고리로 거른다", () => {
    const tables = getProducts("table");
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.every((p) => p.category === "table")).toBe(true);
  });
  it("featured 는 4~5개, 순서대로", () => {
    const f = getFeatured();
    expect(f.length).toBeGreaterThanOrEqual(4);
    expect(f.length).toBeLessThanOrEqual(5);
    const order = f.map((p) => p.featuredOrder!);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("slug 는 유일", () => expect(new Set(getProducts().map((p) => p.slug)).size).toBe(getProducts().length));
  it("모든 카테고리에 상품이 있다", () =>
    Object.keys(CATEGORY_LABEL).forEach((c) => expect(getProducts(c).length).toBeGreaterThan(0)));
  it("slug 로 찾는다", () => {
    const first = getProducts()[0];
    expect(getProduct(first.slug)).toBe(first);
    expect(getProduct("nope")).toBeUndefined();
  });
  it("가격 표기", () => expect(formatPrice(1290000)).toBe("1,290,000원"));
});
