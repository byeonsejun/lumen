import { PRODUCTS } from "./products";
import { CATEGORY_LABEL, type Category, type ColorOption, type Product } from "./types";

export { CATEGORY_LABEL };
export type { Category, ColorOption, Product };

const isCategory = (c: string | undefined): c is Category => !!c && c in CATEGORY_LABEL;

export function getProducts(category?: string): Product[] {
  return isCategory(category) ? PRODUCTS.filter((p) => p.category === category) : PRODUCTS;
}

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getFeatured(): Product[] {
  return PRODUCTS.filter((p) => p.featuredOrder !== undefined).sort((a, b) => a.featuredOrder! - b.featuredOrder!);
}

export function formatPrice(krw: number): string {
  return `${krw.toLocaleString("ko-KR")}원`;
}

export function colorsOf(slug: string): ColorOption[] {
  return getProduct(slug)?.colors ?? [];
}

/** 원래 색(첫 항목)이 아닌 색 옵션. 원래 색 · 모르는 id 면 undefined */
export function colorOption(slug: string, color: string): ColorOption | undefined {
  const cs = colorsOf(slug);
  return cs.slice(1).find((c) => c.id === color);
}

/** 브라우저가 보낸 색은 믿지 않는다 — 카탈로그에 있는 색 id 만, 원래 색 · 모르는 값은 "" */
export function normalizeColor(slug: string, color: string | null | undefined): string {
  return color && colorOption(slug, color) ? color : "";
}
