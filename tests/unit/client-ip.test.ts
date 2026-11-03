import { describe, expect, it } from "vitest";
import { clientIp } from "@/server/client-ip";

describe("clientIp", () => {
  it("x-forwarded-for 의 첫 주소가 실제 손님", () =>
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7"));
  it("없으면 x-real-ip", () => expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2"));
  it("둘 다 없으면 null", () => expect(clientIp(new Headers())).toBeNull());
  it("빈 값은 null", () => expect(clientIp(new Headers({ "x-forwarded-for": " " }))).toBeNull());
});
