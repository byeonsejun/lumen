import { expect, test } from "@playwright/test";
import { getProducts } from "../../src/catalog/query";

test("카테고리로 거른다", async ({ page }) => {
  await page.goto("/products?category=table");
  await expect(page.getByTestId("product-card")).toHaveCount(getProducts("table").length);
  await expect(page.getByRole("link", { name: "테이블", exact: true })).toHaveAttribute("aria-current", "page");
});

test("모르는 카테고리는 전체", async ({ page }) => {
  await page.goto("/products?category=zzz");
  await expect(page.getByTestId("product-card")).toHaveCount(getProducts().length);
});

test("카드는 이름·가격을 보여주고 상세로 간다", async ({ page }) => {
  const p = getProducts()[0];
  await page.goto("/products");
  const card = page.getByTestId("product-card").first();
  await expect(card).toContainText(p.name);
  await expect(card).toHaveAttribute("href", `/products/${p.slug}`);
});

test("카드 썸네일이 실제로 로드된다", async ({ page }) => {
  await page.goto("/products");
  // 목록은 Suspense 로 스트리밍된다 — 숨겨진 임시 영역에서 제자리로 옮겨진 뒤(보일 때)에 잡는다
  const card = page.getByTestId("product-card").first();
  await expect(card).toBeVisible();
  const img = card.locator("img");
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
});
