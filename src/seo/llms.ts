import { CATEGORY_LABEL, formatPrice, type Product } from "@/catalog/query";
import { SITE_URL } from "./site";

/**
 * AI 검색이 사이트를 한 번에 파악하도록 읽을 거리를 만든다(llmstxt.org 형식).
 * 상품 목록은 카탈로그에서 그대로 뽑는다 — 손으로 적으면 상품이 바뀔 때 사이트맵과 어긋난다.
 * 이 사이트는 토스페이먼츠 테스트 결제만 되는 포트폴리오 데모라, 실제 판매처럼 읽히는 말은 쓰지 않는다.
 */
export function buildLlmsTxt(products: Product[]): string {
  const productLines = products.map(
    (p) => `- [${p.name}](${SITE_URL}/products/${p.slug}): ${CATEGORY_LABEL[p.category]} · ${formatPrice(p.priceKRW)}`,
  );

  return [
    "# LUMEN",
    "",
    "> 조명 아래에서 가구를 3D 로 둘러보는 가구 쇼핑몰. 포트폴리오 데모입니다.",
    "",
    "## 페이지",
    "",
    `- [홈](${SITE_URL}): 스포트라이트 아래 가구를 3D 로 둘러보는 쇼룸`,
    `- [Shop](${SITE_URL}/products): 상품 목록`,
    `- [내 방에 놓아 보기](${SITE_URL}/room): 방 크기를 넣고 가구를 3D 로 놓아 보기`,
    `- [개인정보처리방침](${SITE_URL}/privacy)`,
    "",
    "## 상품",
    "",
    ...productLines,
    "",
    "## 안내",
    "",
    "- 토스페이먼츠 테스트 결제만 되는 포트폴리오 데모입니다. 실제로 상품을 팔지 않으며 돈이 오가지 않습니다.",
    "- 상품 이름 · 가격 · 설명은 지어낸 것입니다.",
    "- 3D 모델은 Poly Haven(CC0, https://polyhaven.com) 에셋을 다듬어 썼습니다.",
    "",
    "## 기술",
    "",
    "- Next.js 16 · TypeScript",
    "- three.js(WebGPU · WebGL2) · React Three Fiber",
    "- Auth.js · Prisma · Neon Postgres",
    "- 토스페이먼츠(테스트 결제)",
    "- Vitest · Playwright",
    "- Vercel",
    "",
    "## 만든 사람",
    "",
    "- 변세준",
    "- 포트폴리오: https://sejunb.com",
    "- GitHub: https://github.com/byeonsejun/lumen",
    "",
  ].join("\n");
}
