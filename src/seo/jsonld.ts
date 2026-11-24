import { CATEGORY_LABEL, type Product } from "@/catalog/query";
import { posterUrl } from "@/three/models";
import { SITE_URL } from "./site";

/**
 * 구조화 데이터(JSON-LD)는 화면에 실제로 보이는 값만 담는다 — 검색 엔진은 화면과 어긋난 데이터를 신뢰하지 않는다.
 * `image` 는 목록 카드와 상세 뷰어가 이미 띄우는 그 포스터(posterUrl)라 화면과 같은 그림이다.
 * 홈 주소는 어디서나 끝 슬래시 없는 SITE_URL 로 쓴다 — canonical · 사이트맵과 표기를 맞추려는 것.
 */
const CONTEXT = "https://schema.org";
const BRAND = "LUMEN";

/** 홈 하나에만 쓴다 — 사이트 이름과 발행처를 알려 준다 */
export function websiteJsonLd() {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: BRAND,
    url: SITE_URL,
    inLanguage: "ko",
    publisher: { "@type": "Organization", name: BRAND, url: SITE_URL },
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
  image: string;
  brand: { "@type": "Brand"; name: string };
  offers: { "@type": "Offer"; price: number; priceCurrency: "KRW"; availability: string; url: string };
};
type BreadcrumbLd = {
  "@context": string;
  "@type": "BreadcrumbList";
  itemListElement: { "@type": "ListItem"; position: number; name: string; item: string }[];
};

/** 구조화 데이터 · 공유 카드가 함께 쓰는 상품 사진. 절대 주소이고, 검색이 쓰기에 작지 않게 1200px 로 받는다 */
export const productImageUrl = (p: Pick<Product, "polyhavenId">): string => posterUrl(p.polyhavenId, 1200);

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
      image: productImageUrl(p),
      brand: { "@type": "Brand", name: BRAND },
      offers: {
        "@type": "Offer",
        // 화면의 formatPrice 와 같은 값 — 숫자로 둔다("1,290,000원" 문자열이 아니라)
        price: p.priceKRW,
        priceCurrency: "KRW",
        // 재고 개념이 없다 — 모든 상품을 담고 테스트 결제까지 끝낼 수 있어서 항상 판매 중으로 둔다
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
