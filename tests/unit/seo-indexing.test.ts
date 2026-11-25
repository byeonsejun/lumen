import { describe, expect, it } from "vitest";
import { PRIVATE_PATHS, isPreviewDeploy } from "@/seo/indexing";
import { SITE_URL } from "@/seo/site";

describe("색인 정책", () => {
  it("미리보기 배포만 미리보기로 본다", () => {
    expect(isPreviewDeploy("preview")).toBe(true);
    expect(isPreviewDeploy("production")).toBe(false);
    expect(isPreviewDeploy("development")).toBe(false);
    expect(isPreviewDeploy(undefined)).toBe(false);
  });

  it("정본 주소는 끝 슬래시가 없는 https 주소", () => {
    expect(SITE_URL).toBe("https://lumen-showroom.vercel.app");
  });

  it("비공개 경로는 장바구니 · 결제 · 주문 · 로그인", () => {
    expect([...PRIVATE_PATHS].sort()).toEqual(["/cart", "/checkout", "/login", "/orders"]);
  });
});
