import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { DEMO_PER_IP_PER_HOUR, createDemoUser, demoAllowed, demoBucket, findUser, purgeExpiredDemoUsers, upsertOAuthUser } from "@/server/users";
import { track } from "./helpers";

describe("users", () => {
  it("데모 계정은 만들 때마다 다른 사용자", async () => {
    const a = track(await createDemoUser());
    const b = track(await createDemoUser());
    expect(a.id).not.toBe(b.id);
    expect(a.name).toBe("데모 손님");
  });

  it("24시간 지난 데모 계정만 정리 (장바구니째)", async () => {
    const old = track(await createDemoUser(new Date(Date.now() - 25 * 3600e3)));
    await db().cartItem.create({ data: { userId: old.id, productSlug: "ember-sofa", quantity: 1 } });
    const fresh = track(await createDemoUser());
    await purgeExpiredDemoUsers();
    expect(await findUser(old.id)).toBeNull();
    expect(await findUser(fresh.id)).not.toBeNull();
    expect(await db().cartItem.count({ where: { userId: old.id } })).toBe(0);
  });

  it("OAuth 사용자는 같은 계정이면 한 명", async () => {
    const id = `k-${Date.now()}`;
    const a = track(await upsertOAuthUser("KAKAO", id, "카카오"));
    const b = await upsertOAuthUser("KAKAO", id);
    expect(a.id).toBe(b.id);
  });

  it("정리는 데모만 지운다", async () => {
    const u = track(await upsertOAuthUser("GOOGLE", `g-${Date.now()}`));
    await db().user.update({ where: { id: u.id }, data: { createdAt: new Date(0) } });
    await purgeExpiredDemoUsers();
    expect(await findUser(u.id)).not.toBeNull();
  });

  it("같은 IP 는 1시간에 정해진 수까지만 데모 계정을 만든다", async () => {
    const bucket = demoBucket(`10.0.${Date.now() % 250}.${Math.floor(Math.random() * 250)}`)!;
    const other = demoBucket("10.255.255.1")!;
    for (let i = 0; i < DEMO_PER_IP_PER_HOUR; i++) {
      expect(await demoAllowed(bucket)).toBe(true);
      track(await createDemoUser(new Date(), bucket));
    }
    expect(await demoAllowed(bucket)).toBe(false);
    expect(await demoAllowed(other)).toBe(true);
    // 1시간이 지나면 다시 열린다
    expect(await demoAllowed(bucket, new Date(Date.now() + 3600e3 + 1000))).toBe(true);
  });

  it("IP 원문은 저장하지 않는다", async () => {
    const ip = "203.0.113.7";
    const bucket = demoBucket(ip)!;
    expect(bucket).not.toContain(ip);
    expect(bucket).toBe(demoBucket(ip));
    expect(demoBucket(null)).toBeNull();
    const u = track(await createDemoUser(new Date(), bucket));
    const row = await db().user.findUnique({ where: { id: u.id }, select: { providerUserId: true } });
    expect(row?.providerUserId.startsWith(`${bucket}.`)).toBe(true);
    expect(row?.providerUserId).not.toContain(ip);
  });

  it("uuid 가 아닌 id 로 찾아도 null (오류 아님)", async () => expect(await findUser("not-a-uuid")).toBeNull());
});
