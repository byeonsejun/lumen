import { PRODUCTS } from "./products";
import { CATEGORY_LABEL, type Category, type Product } from "./types";

export { CATEGORY_LABEL };
export type { Category, Product };

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
