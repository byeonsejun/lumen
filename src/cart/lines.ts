import { getProduct } from "@/catalog/query";
import { clampQuantity } from "@/commerce/pricing";

export type CartLine = { slug: string; quantity: number };

export function addLine(lines: CartLine[], slug: string, qty = 1): CartLine[] {
  if (!getProduct(slug)) return lines;
  const i = lines.findIndex((l) => l.slug === slug);
  if (i === -1) return [...lines, { slug, quantity: clampQuantity(qty) }];
  return lines.map((l, j) => (j === i ? { slug, quantity: clampQuantity(l.quantity + qty) } : l));
}

export function setLine(lines: CartLine[], slug: string, qty: number): CartLine[] {
  return lines.map((l) => (l.slug === slug ? { slug, quantity: clampQuantity(qty) } : l));
}

export function removeLine(lines: CartLine[], slug: string): CartLine[] {
  return lines.filter((l) => l.slug !== slug);
}

/** 로그인 순간 합치기 — 서버 순서를 유지하고 새 상품은 뒤에. 같은 상품은 더해 9 에서 자른다 */
export function mergeLines(server: CartLine[], local: CartLine[]): CartLine[] {
  return [...server, ...local].reduce<CartLine[]>((acc, l) => addLine(acc, l.slug, l.quantity), []);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}
