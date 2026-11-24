import type { MetadataRoute } from "next";
import { isPreviewDeploy } from "@/seo/indexing";
import { SITE_URL } from "@/seo/site";

export default function robots(): MetadataRoute.Robots {
  // 미리보기 배포는 운영과 내용이 같아 색인되면 중복 페이지가 되므로 통째로 막고, 사이트맵도 알리지 않는다
  if (isPreviewDeploy(process.env.VERCEL_ENV)) return { rules: { userAgent: "*", disallow: "/" } };
  // AI 크롤러도 막지 않는다. 비공개 페이지(장바구니 · 결제 · 주문 · 로그인)는 robots 가 아니라 noindex 로 뺀다
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
