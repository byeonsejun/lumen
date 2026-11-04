import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, colorOption, colorsOf, formatPrice, getFeatured, getProduct, getProducts, normalizeColor } from "@/catalog/query";

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

  it("색 옵션은 천 · 가죽 가구 7개", () =>
    expect(getProducts().filter((p) => p.colors).map((p) => p.slug).sort()).toEqual(
      ["classic-armchair", "ember-sofa", "halo-lounge-chair", "moss-chair", "pebble-ottoman", "siesta-daybed", "velvet-sofa"],
    ));
  it("첫 색은 원래 색이라 recolor 가 없고, 나머지는 있다 · id 는 상품 안에서 유일", () => {
    for (const p of getProducts().filter((p) => p.colors)) {
      const cs = p.colors!;
      expect(cs.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(cs[0].recolor, p.slug).toBeUndefined();
      cs.slice(1).forEach((c) => expect(c.recolor, `${p.slug}/${c.id}`).toBeDefined());
      expect(new Set(cs.map((c) => c.id)).size, p.slug).toBe(cs.length);
      cs.forEach((c) => expect(c.swatch).toMatch(/^#[0-9a-f]{6}$/i));
    }
  });
  it("normalizeColor — 카탈로그에 있는 색만, 원래 색은 \"\"", () => {
    expect(normalizeColor("velvet-sofa", "navy")).toBe("navy");
    expect(normalizeColor("velvet-sofa", colorsOf("velvet-sofa")[0].id)).toBe("");
    expect(normalizeColor("velvet-sofa", "no-such")).toBe("");
    expect(normalizeColor("orbit-coffee-table", "navy")).toBe("");
    expect(normalizeColor("velvet-sofa", null)).toBe("");
  });
  it("colorOption · colorsOf", () => {
    expect(colorOption("velvet-sofa", "navy")?.label).toBe("네이비");
    expect(colorOption("velvet-sofa", "")).toBeUndefined();
    expect(colorsOf("orbit-coffee-table")).toEqual([]);
  });
  it("색을 고를 수 있는 가구의 소재 문구에는 색 이름이 없다 — 네이비를 골랐는데 '아이보리 패브릭' 이면 안 된다", () => {
    for (const p of getProducts().filter((p) => p.colors))
      for (const c of p.colors!) expect(p.material, `${p.slug}: ${c.label}`).not.toContain(c.label);
  });
});
