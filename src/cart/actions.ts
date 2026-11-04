"use server";

import { auth } from "@/auth";
import { findUser } from "@/server/users";
import type { CartLine } from "./lines";
import { addToLine, mergeIntoCart, readCart, writeLine } from "./repo";

export type CartResult = { ok: true; lines: CartLine[] } | { ok: false; reason: "signed-out" };

/** 세션이 없거나, JWT 는 살아 있는데 사용자가 정리됐으면(24시간 지난 데모) 로그아웃 상태로 본다 */
async function viewerId(): Promise<string | null> {
  const id = (await auth())?.viewer?.id;
  if (!id) return null;
  return (await findUser(id)) ? id : null;
}

async function withViewer(run: (userId: string) => Promise<unknown>): Promise<CartResult> {
  const id = await viewerId();
  if (!id) return { ok: false, reason: "signed-out" };
  await run(id);
  return { ok: true, lines: await readCart(id) };
}

export async function getCartAction(): Promise<CartResult> {
  return withViewer(async () => {});
}
export async function addToCartAction(slug: string, qty = 1, color = ""): Promise<CartResult> {
  return withViewer((id) => addToLine(id, slug, qty, color));
}
export async function setCartLineAction(slug: string, qty: number, color = ""): Promise<CartResult> {
  return withViewer((id) => writeLine(id, slug, Math.max(qty, 1), color));
}
export async function removeCartLineAction(slug: string, color = ""): Promise<CartResult> {
  return withViewer((id) => writeLine(id, slug, 0, color));
}
export async function mergeGuestCartAction(lines: CartLine[]): Promise<CartResult> {
  return withViewer((id) => mergeIntoCart(id, Array.isArray(lines) ? lines.slice(0, 50) : []));
}
