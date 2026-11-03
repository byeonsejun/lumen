import { getProduct } from "@/catalog/query";
import { clampQuantity } from "@/commerce/pricing";
import { db } from "@/server/db";
import { mergeLines, type CartLine } from "./lines";

/** 서버 장바구니 — userId 를 인자로 받아 세션과 떼어 둔다(테스트 가능) */
export async function readCart(userId: string): Promise<CartLine[]> {
  const rows = await db().cartItem.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { productSlug: "asc" }] });
  return rows.filter((r) => getProduct(r.productSlug)).map((r) => ({ slug: r.productSlug, quantity: r.quantity }));
}

/** qty 0 이하면 삭제, 1~9 clamp, 모르는 상품은 무시 */
export async function writeLine(userId: string, slug: string, qty: number): Promise<void> {
  if (!getProduct(slug)) return;
  if (qty <= 0) {
    await db().cartItem.deleteMany({ where: { userId, productSlug: slug } });
    return;
  }
  const quantity = clampQuantity(qty);
  await db().cartItem.upsert({
    where: { userId_productSlug: { userId, productSlug: slug } },
    create: { userId, productSlug: slug, quantity },
    update: { quantity },
  });
}

export async function addToLine(userId: string, slug: string, qty: number): Promise<void> {
  const current = (await readCart(userId)).find((l) => l.slug === slug)?.quantity ?? 0;
  await writeLine(userId, slug, current + qty);
}

export async function mergeIntoCart(userId: string, local: CartLine[]): Promise<CartLine[]> {
  const merged = mergeLines(await readCart(userId), local);
  await db().$transaction(
    merged.map((l) =>
      db().cartItem.upsert({
        where: { userId_productSlug: { userId, productSlug: l.slug } },
        create: { userId, productSlug: l.slug, quantity: l.quantity },
        update: { quantity: l.quantity },
      }),
    ),
  );
  return readCart(userId);
}

/** 결제가 끝나면 주문한 수량만큼만 뺀다 — 결제 중 다른 탭에서 담은 가구는 남긴다 */
export async function subtractOrdered(userId: string, ordered: CartLine[]): Promise<void> {
  const current = await readCart(userId);
  for (const o of ordered) {
    const left = (current.find((l) => l.slug === o.slug)?.quantity ?? 0) - o.quantity;
    await writeLine(userId, o.slug, left);
  }
}
