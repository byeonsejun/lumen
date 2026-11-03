import { describe, expect, it } from "vitest";
import { db } from "@/server/db";

describe("db", () => {
  it("dev DB 에 연결되고 마이그레이션이 적용돼 있다", async () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
    await expect(db().user.count()).resolves.toBeTypeOf("number");
  });
});
