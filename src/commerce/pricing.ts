import { getProduct } from "@/catalog/query";

export type PricedLine = { slug: string; name: string; unitPriceKRW: number; quantity: number; subtotalKRW: number };

export const MAX_QUANTITY = 9;

/** 수량을 1~9 정수로 맞춘다 (소수는 내림) */
export function clampQuantity(q: number): number {
  const n = Number.isFinite(q) ? Math.floor(q) : 1;
  return Math.min(Math.max(n, 1), MAX_QUANTITY);
}

/** 가격은 언제나 카탈로그로 다시 계산한다. 클라이언트가 보낸 가격은 받지 않는다 */
export function priceLines(lines: { slug: string; quantity: number }[]): { lines: PricedLine[]; totalKRW: number } {
  const merged = new Map<string, number>();
  for (const l of lines) {
    if (!getProduct(l.slug)) continue;
    merged.set(l.slug, (merged.get(l.slug) ?? 0) + Math.max(Math.floor(Number.isFinite(l.quantity) ? l.quantity : 1), 1));
  }
  const priced = [...merged].map(([slug, q]) => {
    const p = getProduct(slug)!;
    const quantity = clampQuantity(q);
    return { slug, name: p.name, unitPriceKRW: p.priceKRW, quantity, subtotalKRW: p.priceKRW * quantity };
  });
  return { lines: priced, totalKRW: priced.reduce((s, l) => s + l.subtotalKRW, 0) };
}

export function orderNameOf(lines: PricedLine[]): string {
  if (lines.length === 0) return "";
  return lines.length === 1 ? lines[0].name : `${lines[0].name} 외 ${lines.length - 1}건`;
}

/** 토스가 돌려준 amount 가 저장된 합계와 정확히 같은지. 정수 표기만 인정한다 */
export function amountMatches(expectedKRW: number, received: string | number | null): boolean {
  if (received === null) return false;
  const s = typeof received === "number" ? String(received) : received;
  return /^\d+$/.test(s) && Number(s) === expectedKRW;
}
