import { afterEach } from "vitest";
import { db } from "@/server/db";

/** 테스트마다 만든 사용자만 지운다(cascade 로 장바구니 · 주문도) */
const created = new Set<string>();
export function track<T extends { id: string }>(u: T): T {
  created.add(u.id);
  return u;
}
afterEach(async () => {
  if (created.size) await db().user.deleteMany({ where: { id: { in: [...created] } } });
  created.clear();
});
