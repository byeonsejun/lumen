import { getProduct, normalizeColor } from "@/catalog/query";
import { clampQuantity } from "@/commerce/pricing";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { lineKey, mergeLines, type CartLine } from "./lines";

/** 서버 장바구니 — userId 를 인자로 받아 세션과 떼어 둔다(테스트 가능). 한 줄 = (상품, 색) */
export async function readCart(userId: string, tx: Prisma.TransactionClient = db()): Promise<CartLine[]> {
  const rows = await tx.cartItem.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { productSlug: "asc" }, { color: "asc" }] });
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

/**
 * 로그인 순간 브라우저 장바구니를 서버로 합친다. mergeId 는 브라우저가 장바구니 내용마다 만드는 번호다.
 * 응답이 끊기면 브라우저는 다음에 같은 번호로 다시 보내는데, 이미 받은 번호면 더하지 않는다.
 * 번호 기록과 더하기를 한 트랜잭션에 넣어, 같은 번호가 동시에 와도(탭 두 개) 뒤에 온 쪽은 앞의 커밋을 기다렸다 건너뛴다
 */
export async function mergeIntoCart(userId: string, local: CartLine[], mergeId: string): Promise<CartLine[]> {
  await db().$transaction(async (tx) => {
    const first = await tx.cartMerge.createMany({ data: [{ userId, id: mergeId }], skipDuplicates: true });
    if (first.count === 0) return;
    for (const l of mergeLines(await readCart(userId, tx), local)) {
      await tx.cartItem.upsert({
        where: { userId_productSlug_color: { userId, productSlug: l.slug, color: l.color ?? "" } },
        create: { userId, productSlug: l.slug, color: l.color ?? "", quantity: l.quantity },
        update: { quantity: l.quantity },
      });
    }
  });
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
