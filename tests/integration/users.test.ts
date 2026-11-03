import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createDemoUser, findUser, purgeExpiredDemoUsers, upsertOAuthUser } from "@/server/users";
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

  it("uuid 가 아닌 id 로 찾아도 null (오류 아님)", async () => expect(await findUser("not-a-uuid")).toBeNull());
});
