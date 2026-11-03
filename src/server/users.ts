import { createHmac, randomBytes } from "node:crypto";
import type { AuthProvider } from "@/generated/prisma/enums";
import { db } from "./db";

const DEMO_TTL_MS = 24 * 3600e3;
/** 같은 IP 에서 1시간에 만들 수 있는 데모 계정 수. 회사 하나가 IP 를 같이 써도 넉넉한 값 */
export const DEMO_PER_IP_PER_HOUR = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function upsertOAuthUser(provider: "KAKAO" | "GOOGLE", providerUserId: string, name?: string) {
  return db().user.upsert({
    where: { provider_providerUserId: { provider, providerUserId } },
    create: { provider, providerUserId, name },
    update: name ? { name } : {},
    select: { id: true },
  });
}

/**
 * IP 를 그대로 저장하지 않고 비밀 키로 해시한 앞 16자만 쓴다. 같은 IP 끼리 묶을 수만 있으면 된다.
 * IP 를 모르면 null — 제한하지 않는다
 */
export function demoBucket(ip: string | null): string | null {
  if (!ip) return null;
  return createHmac("sha256", process.env.AUTH_SECRET ?? "lumen").update(ip).digest("hex").slice(0, 16);
}

/** 이 IP 묶음이 최근 1시간 안에 만든 데모 계정이 한도 아래인가 */
export async function demoAllowed(bucket: string, now = new Date()): Promise<boolean> {
  const recent = await db().user.count({
    where: { provider: "DEMO", providerUserId: { startsWith: `${bucket}.` }, createdAt: { gt: new Date(now.getTime() - 3600e3) } },
  });
  return recent < DEMO_PER_IP_PER_HOUR;
}

/**
 * 브라우저마다 따로 쓰는 임시 계정. 공용 계정 하나면 여러 사람의 장바구니 · 주문이 섞인다.
 * IP 묶음을 providerUserId 앞에 붙여 두면 컬럼을 늘리지 않고 한도를 셀 수 있다
 */
export async function createDemoUser(now = new Date(), bucket: string | null = null) {
  const random = randomBytes(12).toString("hex");
  return db().user.create({
    data: { provider: "DEMO", providerUserId: bucket ? `${bucket}.${random}` : random, name: "데모 손님", createdAt: now },
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
