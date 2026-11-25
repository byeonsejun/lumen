import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, formatPrice, getProducts } from "@/catalog/query";
import { buildLlmsTxt } from "@/seo/llms";
import { SITE_URL } from "@/seo/site";

describe("buildLlmsTxt", () => {
  const products = getProducts();
  const text = buildLlmsTxt(products);
  const lines = text.split("\n");

  it("첫 줄은 사이트 이름, 바로 다음은 요약 한 줄", () => {
    expect(lines[0]).toBe("# LUMEN");
    const summary = lines.find((l) => l.startsWith("> "))!;
    expect(summary).toContain("가구 쇼핑몰");
    expect(summary).toContain("포트폴리오 데모");
    expect(text.split("\n").filter((l) => l.startsWith("> "))).toHaveLength(1);
  });

  it("섹션이 정해진 순서로 있다", () => {
    const headings = lines.filter((l) => l.startsWith("## "));
    expect(headings).toEqual(["## 페이지", "## 상품", "## 안내", "## 기술", "## 만든 사람"]);
  });

  it("페이지 섹션에 공개 페이지 네 곳을 정본 주소로 건다", () => {
    for (const link of [
      `[홈](${SITE_URL})`,
      `[Shop](${SITE_URL}/products)`,
      `[내 방에 놓아 보기](${SITE_URL}/room)`,
      `[개인정보처리방침](${SITE_URL}/privacy)`,
    ]) {
      expect(text).toContain(link);
    }
  });

  it("상품마다 이름 · 카테고리 · 가격이 있는 링크 한 줄이다", () => {
    for (const p of products) {
      expect(text).toContain(`- [${p.name}](${SITE_URL}/products/${p.slug}): ${CATEGORY_LABEL[p.category]} · ${formatPrice(p.priceKRW)}`);
    }
    expect(lines.filter((l) => l.includes(`](${SITE_URL}/products/`))).toHaveLength(products.length);
  });

  it("테스트 결제 데모와 Poly Haven(CC0) 출처를 밝힌다", () => {
    expect(text).toContain("토스페이먼츠 테스트 결제만 되는 포트폴리오 데모");
    expect(text).toContain("Poly Haven");
    expect(text).toContain("CC0");
  });

  it("실제 판매처럼 읽힐 말은 쓰지 않는다", () => {
    expect(text).not.toMatch(/무료\s*배송|재고|지금\s*구매|실제\s*판매/);
  });

  it("기술 스택과 만든 사람 정보를 담고 이메일은 없다", () => {
    for (const tech of ["Next.js 16", "TypeScript", "three.js", "WebGPU", "WebGL2", "React Three Fiber", "Auth.js", "Prisma", "Neon Postgres", "토스페이먼츠", "Vitest", "Playwright", "Vercel"]) {
      expect(text).toContain(tech);
    }
    expect(text).toContain("변세준");
    expect(text).toContain("https://sejunb.com");
    expect(text).toContain("https://github.com/byeonsejun/lumen");
    expect(text).not.toMatch(/@[\w-]+\.[a-z]/i);
  });

  it("끝은 줄바꿈 하나", () => {
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });
});
