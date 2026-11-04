import { getProduct, normalizeColor } from "@/catalog/query";
import { clampQuantity } from "@/commerce/pricing";
import { db } from "@/server/db";
import { lineKey, mergeLines, type CartLine } from "./lines";

/** 서버 장바구니 — userId 를 인자로 받아 세션과 떼어 둔다(테스트 가능). 한 줄 = (상품, 색) */
export async function readCart(userId: string): Promise<CartLine[]> {
  const rows = await db().cartItem.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { productSlug: "asc" }, { color: "asc" }] });
  return rows
    .filter((r) => getProduct(r.productSlug))
    .map((r) => (r.color ? { slug: r.productSlug, quantity: r.quantity, color: r.color } : { slug: r.productSlug, quantity: r.quantity }));
}

/** qty 0 이하면 삭제, 1~9 clamp, 모르는 상품은 무시, 모르는 색은 원래 색 */
export async function writeLine(userId: string, slug: string, qty: number, color = ""): Promise<void> {
  if (!getProduct(slug)) return;
  const c = normalizeColor(slug, color);
  if (qty <= 0) {
    await db().cartItem.deleteMany({ where: { userId, productSlug: slug, color: c } });
    return;
  }
  const quantity = clampQuantity(qty);
  await db().cartItem.upsert({
    where: { userId_productSlug_color: { userId, productSlug: slug, color: c } },
    create: { userId, productSlug: slug, color: c, quantity },
    update: { quantity },
  });
}

export async function addToLine(userId: string, slug: string, qty: number, color = ""): Promise<void> {
  const key = lineKey({ slug, color: normalizeColor(slug, color) });
  const current = (await readCart(userId)).find((l) => lineKey(l) === key)?.quantity ?? 0;
  await writeLine(userId, slug, current + qty, color);
}

export async function mergeIntoCart(userId: string, local: CartLine[]): Promise<CartLine[]> {
  const merged = mergeLines(await readCart(userId), local);
  await db().$transaction(
    merged.map((l) =>
      db().cartItem.upsert({
        where: { userId_productSlug_color: { userId, productSlug: l.slug, color: l.color ?? "" } },
        create: { userId, productSlug: l.slug, color: l.color ?? "", quantity: l.quantity },
        update: { quantity: l.quantity },
      }),
    ),
  );
  return readCart(userId);
}

/** 결제가 끝나면 주문한 (상품, 색)의 수량만큼만 뺀다 — 결제 중 다른 탭에서 담은 가구는 남긴다 */
export async function subtractOrdered(userId: string, ordered: CartLine[]): Promise<void> {
  const current = await readCart(userId);
  for (const o of ordered) {
    const left = (current.find((l) => lineKey(l) === lineKey(o))?.quantity ?? 0) - o.quantity;
    await writeLine(userId, o.slug, left, o.color ?? "");
  }
}
