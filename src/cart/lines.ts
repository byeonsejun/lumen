import { getProduct, normalizeColor } from "@/catalog/query";
import { clampQuantity } from "@/commerce/pricing";

/** 장바구니 한 줄 = (상품, 색). color 가 없으면 원래 색 */
export type CartLine = { slug: string; quantity: number; color?: string };

/** 줄을 가리키는 열쇠 — 같은 상품이라도 색이 다르면 다른 줄 */
export const lineKey = (l: { slug: string; color?: string }) => `${l.slug}|${l.color ?? ""}`;

/** "slug|color" → 줄. 원래 색이면 color 를 적지 않는다 */
export function parseLineKey(key: string): { slug: string; color?: string } {
  const [slug, color = ""] = key.split("|");
  return color ? { slug, color } : { slug };
}

const line = (slug: string, quantity: number, color: string): CartLine => (color ? { slug, quantity, color } : { slug, quantity });

export function addLine(lines: CartLine[], slug: string, qty = 1, color = ""): CartLine[] {
  if (!getProduct(slug)) return lines;
  const c = normalizeColor(slug, color);
  const key = lineKey({ slug, color: c });
  const i = lines.findIndex((l) => lineKey(l) === key);
  if (i === -1) return [...lines, line(slug, clampQuantity(qty), c)];
  return lines.map((l, j) => (j === i ? line(slug, clampQuantity(l.quantity + qty), c) : l));
}

/** 수량 바꾸기 · 빼기는 모르는 색이면 그대로 둔다 — 원래 색으로 읽으면 엉뚱한 줄이 바뀐다 */
export function setLine(lines: CartLine[], slug: string, qty: number, color = ""): CartLine[] {
  if (normalizeColor(slug, color) !== color) return lines;
  const key = lineKey({ slug, color });
  return lines.map((l) => (lineKey(l) === key ? line(slug, clampQuantity(qty), l.color ?? "") : l));
}

export function removeLine(lines: CartLine[], slug: string, color = ""): CartLine[] {
  if (normalizeColor(slug, color) !== color) return lines;
  const key = lineKey({ slug, color });
  return lines.filter((l) => lineKey(l) !== key);
}

/** 로그인 순간 합치기 — 서버 순서를 유지하고 새 줄은 뒤에. 같은 (상품, 색)은 더해 9 에서 자른다 */
export function mergeLines(server: CartLine[], local: CartLine[]): CartLine[] {
  return [...server, ...local].reduce<CartLine[]>((acc, l) => addLine(acc, l.slug, l.quantity, l.color), []);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}
