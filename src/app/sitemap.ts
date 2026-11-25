import type { MetadataRoute } from "next";
import { getProducts } from "@/catalog/query";
import { SITE_URL } from "@/seo/site";

// 공개 페이지만, 쿼리 문자열 없는 정본 주소로. 홈은 끝 슬래시 없이 SITE_URL 그대로
const STATIC_PATHS = ["", "/products", "/room", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...STATIC_PATHS, ...getProducts().map((p) => `/products/${p.slug}`)].map((path) => ({ url: SITE_URL + path }));
}
