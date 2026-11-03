import { randomBytes } from "node:crypto";
import type { AuthProvider } from "@/generated/prisma/enums";
import { db } from "./db";

const DEMO_TTL_MS = 24 * 3600e3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function upsertOAuthUser(provider: "KAKAO" | "GOOGLE", providerUserId: string, name?: string) {
  return db().user.upsert({
    where: { provider_providerUserId: { provider, providerUserId } },
    create: { provider, providerUserId, name },
    update: name ? { name } : {},
    select: { id: true },
  });
}

/** 브라우저마다 따로 쓰는 임시 계정. 공용 계정 하나면 여러 사람의 장바구니 · 주문이 섞인다 */
export async function createDemoUser(now = new Date()) {
  return db().user.create({
    data: { provider: "DEMO", providerUserId: randomBytes(12).toString("hex"), name: "데모 손님", createdAt: now },
    select: { id: true, name: true },
  }) as Promise<{ id: string; name: string }>;
}

/** 만든 지 24시간 지난 데모 계정을 장바구니 · 주문째 지운다 */
export async function purgeExpiredDemoUsers(now = new Date()): Promise<number> {
  const { count } = await db().user.deleteMany({
    where: { provider: "DEMO", createdAt: { lt: new Date(now.getTime() - DEMO_TTL_MS) } },
  });
  return count;
}

export async function findUser(id: string): Promise<{ id: string; provider: AuthProvider; name: string | null } | null> {
  if (!UUID.test(id)) return null;
  return db().user.findUnique({ where: { id }, select: { id: true, provider: true, name: true } });
}
