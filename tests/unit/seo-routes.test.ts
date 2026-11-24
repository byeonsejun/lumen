import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getProducts } from "@/catalog/query";
import { PRIVATE_PATHS } from "@/seo/indexing";
import { SITE_URL } from "@/seo/site";

afterEach(() => vi.unstubAllEnvs());

describe("robots", () => {
  it("미리보기 배포는 전부 막고 사이트맵도 알리지 않는다", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(r.sitemap).toBeUndefined();
  });

  it.each(["production", undefined])("VERCEL_ENV=%s 는 열어 두고 /api/ 만 막는다", (env) => {
    vi.stubEnv("VERCEL_ENV", env);
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/api/"] });
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("비공개 경로는 robots 가 아니라 noindex 로 뺀다 — disallow 에 없다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const rules = robots().rules as { disallow: string[] };
    for (const p of PRIVATE_PATHS) expect(rules.disallow).not.toContain(p);
  });
});

describe("sitemap", () => {
  const urls = sitemap().map((e) => e.url);

  it("고정 페이지와 상품 20개를 담는다", () => {
    const products = getProducts();
    expect(products).toHaveLength(20);
    const expected = [
      "/",
      "/products",
      "/room",
      "/privacy",
      ...products.map((p) => `/products/${p.slug}`),
    ].map((p) => (p === "/" ? SITE_URL : SITE_URL + p));
    expect([...urls].sort()).toEqual([...expected].sort());
  });

  it("모두 SITE_URL 로 시작하고 쿼리 문자열이 없다", () => {
    for (const u of urls) {
      expect(u.startsWith(SITE_URL)).toBe(true);
      expect(u).not.toContain("?");
    }
  });

  it("비공개 경로가 없다", () => {
    for (const u of urls) {
      const path = u.slice(SITE_URL.length);
      for (const p of PRIVATE_PATHS) expect(path === p || path.startsWith(p + "/")).toBe(false);
    }
  });
});
