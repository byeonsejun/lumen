import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, getProduct } from "@/catalog/query";
import { jsonLdScript, productJsonLd, websiteJsonLd } from "@/seo/jsonld";
import { SITE_URL } from "@/seo/site";

const sofa = getProduct("ember-sofa")!;
const url = `${SITE_URL}/products/ember-sofa`;

describe("productJsonLd", () => {
  const [product, crumbs] = productJsonLd(sofa);

  it("Product 에 화면에 보이는 값만 담는다", () => {
    expect(product).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: sofa.name,
      description: sofa.description,
      material: sofa.material,
      url,
      category: CATEGORY_LABEL[sofa.category],
      brand: { "@type": "Brand", name: "LUMEN" },
    });
  });

  it("가격은 화면 가격과 같은 숫자이고 판매 중으로 표시한다", () => {
    expect(product.offers).toEqual({
      "@type": "Offer",
      price: sofa.priceKRW,
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
      url,
    });
    expect(typeof product.offers.price).toBe("number");
  });

  it("사진이 없으므로 image 키를 두지 않는다", () => {
    expect("image" in product).toBe(false);
  });

  it("BreadcrumbList 는 홈 → Shop → 상품 순서다", () => {
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: sofa.name, item: url },
    ]);
  });
});

describe("websiteJsonLd", () => {
  it("WebSite 와 발행처 Organization 을 담는다", () => {
    expect(websiteJsonLd()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "LUMEN",
      url: `${SITE_URL}/`,
      inLanguage: "ko",
      publisher: { "@type": "Organization", name: "LUMEN", url: `${SITE_URL}/` },
    });
  });
});

describe("jsonLdScript", () => {
  it("< 를 \\u003c 로 바꿔 태그를 닫을 수 없게 한다", () => {
    const out = jsonLdScript({ name: "</script><b>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
    expect(JSON.parse(out)).toEqual({ name: "</script><b>" });
  });
});
