import { expect, test, type Page } from "@playwright/test";
import { formatPrice, getProducts } from "../../src/catalog/query";
import { SITE_URL } from "../../src/seo/site";
import { cartSettled, loginAsDemo } from "./helpers";

const meta = (page: Page, name: string) => page.locator(`meta[name="${name}"]`).first();
// robots 메타가 아예 없으면 빈 문자열 — 색인 대상이라는 뜻
const robots = async (page: Page) => ((await meta(page, "robots").count()) ? ((await meta(page, "robots").getAttribute("content")) ?? "") : "");

// 홈의 정본은 끝 슬래시 없는 SITE_URL — 사이트맵과 같은 표기
const PUBLIC: [path: string, canonical: string][] = [
  ["/", SITE_URL],
  ["/products", `${SITE_URL}/products`],
  ["/products/ember-sofa", `${SITE_URL}/products/ember-sofa`],
  ["/room", `${SITE_URL}/room`],
  ["/privacy", `${SITE_URL}/privacy`],
];

for (const [path, canonical] of PUBLIC) {
  test(`${path}: 정본 주소 · 설명 · 공유 이미지가 있고 색인 대상이다`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    expect(((await meta(page, "description").getAttribute("content")) ?? "").trim().length).toBeGreaterThan(0);
    // 공유 카드의 주소는 정본과 같다
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${SITE_URL}/og.png`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    expect(await robots(page)).not.toContain("noindex");
  });
}

test("제목에 사이트 이름이 한 번만 붙는다", async ({ page }) => {
  await page.goto("/products");
  await expect(page).toHaveTitle("Shop — LUMEN");
  await page.goto("/products/ember-sofa");
  await expect(page).toHaveTitle(/^Ember .* — LUMEN$/);
});

// layout 에 고정 문구를 두면 모든 페이지가 같은 제목 · 설명으로 공유된다 — 페이지 자기 것이 나와야 한다
for (const path of ["/products/ember-sofa", "/privacy", "/products", "/room", "/"]) {
  test(`${path}: 공유 카드 제목 · 설명이 그 페이지의 것이다`, async ({ page }) => {
    await page.goto(path);
    const description = await meta(page, "description").getAttribute("content");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description!);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", await page.title());
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", description!);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", await page.title());
  });
}

test("없는 상품 주소의 제목은 LUMEN 한 번만", async ({ page }) => {
  const res = await page.goto("/products/no-such-sofa");
  expect(res!.status()).toBe(404);
  await expect(page).toHaveTitle(/^(?!LUMEN — LUMEN).*/);
});

test("카테고리 필터가 붙어도 정본 주소는 /products", async ({ page }) => {
  await page.goto("/products?category=seating");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}/products`);
});

test("상품 설명이 그 상품의 description 으로 시작한다", async ({ page }) => {
  const p = getProducts().find((x) => x.slug === "ember-sofa")!;
  await page.goto(`/products/${p.slug}`);
  const content = (await meta(page, "description").getAttribute("content")) ?? "";
  expect(content.startsWith(p.description)).toBe(true);
});

test("공유 이미지 /og.png 가 PNG 로 내려간다", async ({ request }) => {
  const res = await request.get("/og.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("로그인 없이 열리는 비공개 화면은 noindex", async ({ page }) => {
  for (const path of ["/cart", "/login", "/login?callbackUrl=%2Forders"]) {
    await page.goto(path);
    expect(await robots(page), path).toContain("noindex");
  }
});

// /checkout · /orders 아래는 src/proxy.ts 가 응답 전에 /login 으로 보낸다 — 원 응답엔 HTML 이 없다.
// 크롤러는 그 리다이렉트를 따라 noindex 인 /login 에 닿고, 이 주소들은 색인에 남지 않는다
test("로그인이 필요한 화면은 /login 으로 보내고 그 도착지가 noindex", async ({ request, page }) => {
  for (const path of ["/checkout", "/checkout/fail", "/orders", "/orders/LMnotarealorder000000", "/orders/LMnotarealorder000000/complete"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(307);
    expect(new URL(res.headers()["location"]!, SITE_URL).pathname, path).toBe("/login");
  }
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Forders$/);
  expect(await robots(page)).toContain("noindex");
});

test("로그인한 뒤 열리는 주문 화면도 모두 noindex", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/products/ember-sofa");
  await page.getByTestId("add-to-cart").click();
  await cartSettled(page);

  await page.goto("/checkout");
  expect(await robots(page), "/checkout").toContain("noindex");
  const fail = await page.goto("/checkout/fail");
  expect(fail!.status()).toBe(200);
  expect(await robots(page), "/checkout/fail").toContain("noindex");

  await page.goto("/checkout");
  await page.getByLabel("받는 분").fill("변세준");
  await page.getByLabel("연락처").fill("010-0000-0000");
  await page.getByLabel("주소").fill("서울시 어딘가 1");
  await page.getByRole("button", { name: /결제하기/ }).click();
  await expect(page).toHaveURL(/\/complete$/, { timeout: 20_000 });
  const id = page.url().match(/orders\/(LM[0-9A-Za-z]{20})/)![1];
  expect(await robots(page), "complete").toContain("noindex");

  for (const path of ["/orders", `/orders/${id}`]) {
    await page.goto(path);
    expect(await robots(page), path).toContain("noindex");
  }
});

// 구조화 데이터는 화면에 보이는 값과 어긋나면 안 된다 — 특히 가격
type LdNode = { "@type": string; url?: string; offers?: { price: number; priceCurrency: string; availability: string }; itemListElement?: { position: number }[] };
const ldJson = async (page: Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as LdNode);

test("상품 상세의 구조화 데이터 가격이 화면 가격과 같다", async ({ page }) => {
  const p = getProducts().find((x) => x.slug === "ember-sofa")!;
  await page.goto(`/products/${p.slug}`);
  const shown = page.getByText(formatPrice(p.priceKRW), { exact: true });
  await expect(shown).toBeVisible();
  const visible = Number(((await shown.textContent()) ?? "").replace(/[^0-9]/g, ""));

  const [product, crumbs, ...rest] = await ldJson(page);
  expect(rest).toHaveLength(0);
  expect(product["@type"]).toBe("Product");
  expect(product.offers!.price).toBe(visible);
  expect(product.offers!.priceCurrency).toBe("KRW");
  expect(product.offers!.availability).toBe("https://schema.org/InStock");
  expect(product.url).toBe(`${SITE_URL}/products/${p.slug}`);
  expect("image" in product).toBe(false);
  expect(crumbs["@type"]).toBe("BreadcrumbList");
  expect(crumbs.itemListElement!.map((i) => i.position)).toEqual([1, 2, 3]);
});

test("없는 상품 주소에는 구조화 데이터가 없다", async ({ page }) => {
  const res = await page.goto("/products/없는-상품");
  expect(res!.status()).toBe(404);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test("홈에는 WebSite 구조화 데이터만 있다", async ({ page }) => {
  await page.goto("/");
  const types = (await ldJson(page)).map((d) => d["@type"]);
  expect(types).toEqual(["WebSite"]);
});

test("상품 목록 · 개인정보 화면에는 구조화 데이터가 없다", async ({ page }) => {
  for (const path of ["/products", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator('script[type="application/ld+json"]'), path).toHaveCount(0);
  }
});
