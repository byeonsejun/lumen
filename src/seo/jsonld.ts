import { CATEGORY_LABEL, type Product } from "@/catalog/query";
import { SITE_URL } from "./site";

/**
 * 구조화 데이터(JSON-LD)는 화면에 실제로 보이는 값만 담는다 — 검색 엔진은 화면과 어긋난 데이터를 신뢰하지 않는다.
 * 그래서 상품 사진이 없는 지금은 `image` 를 일부러 뺀다(3D 모델만 있다).
 */
const CONTEXT = "https://schema.org";
const BRAND = "LUMEN";

/** 홈 하나에만 쓴다 — 사이트 이름과 발행처를 알려 준다 */
export function websiteJsonLd() {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: BRAND,
    url: `${SITE_URL}/`,
    inLanguage: "ko",
    publisher: { "@type": "Organization", name: BRAND, url: `${SITE_URL}/` },
  };
}

type ProductLd = {
  "@context": string;
  "@type": "Product";
  name: string;
  description: string;
  material: string;
  category: string;
  url: string;
  brand: { "@type": "Brand"; name: string };
  offers: { "@type": "Offer"; price: number; priceCurrency: "KRW"; availability: string; url: string };
};
type BreadcrumbLd = {
  "@context": string;
  "@type": "BreadcrumbList";
  itemListElement: { "@type": "ListItem"; position: number; name: string; item: string }[];
};

/** 상품 상세용 — Product(가격 · 판매 상태)와 이동 경로(BreadcrumbList) 두 개 */
export function productJsonLd(p: Product): [product: ProductLd, breadcrumbs: BreadcrumbLd] {
  const url = `${SITE_URL}/products/${p.slug}`;
  return [
    {
      "@context": CONTEXT,
      "@type": "Product",
      name: p.name,
      description: p.description,
      material: p.material,
      category: CATEGORY_LABEL[p.category],
      url,
      brand: { "@type": "Brand", name: BRAND },
      offers: {
        "@type": "Offer",
        // 화면의 formatPrice 와 같은 값 — 숫자로 둔다("1,290,000원" 문자열이 아니라)
        price: p.priceKRW,
        priceCurrency: "KRW",
        availability: "https://schema.org/InStock",
        url,
      },
    },
    {
      "@context": CONTEXT,
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/products` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
  ];
}

/** `<script>` 안에 그대로 넣을 문자열. `<` 를 이스케이프해 상품 문구에 `</script>` 가 섞여도 태그가 닫히지 않게 한다 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
