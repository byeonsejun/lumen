import { expect, test } from "@playwright/test";
import { formatPrice, getProducts } from "../../src/catalog/query";

const p = getProducts()[0];

test("상세에 이름·가격·출처가 있다", async ({ page }) => {
  await page.goto(`/products/${p.slug}`);
  await expect(page.getByRole("heading", { name: p.name })).toBeVisible();
  await expect(page.getByText(formatPrice(p.priceKRW))).toBeVisible();
  await expect(page.locator(`a[href="https://polyhaven.com/a/${p.polyhavenId}"]`)).toBeVisible();
  await expect(page.getByRole("button", { name: /장바구니 담기/ })).toBeDisabled();
});

test("3D 뷰어와 치수 토글", async ({ page }) => {
  await page.goto(`/products/${p.slug}`);
  await expect(page.getByTestId("stage-canvas")).toBeVisible();
  await page.getByRole("button", { name: "치수 보기" }).click();
  await expect(page.getByTestId("dimension-label")).toHaveCount(3);
  const [w, h, d] = p.dimensionsMm.map((v) => Math.round(v).toLocaleString("ko-KR"));
  await expect(page.getByTestId("dimension-label").nth(0)).toContainText(`W ${w}`);
  await expect(page.getByTestId("dimension-label").nth(1)).toContainText(`H ${h}`);
  await expect(page.getByTestId("dimension-label").nth(2)).toContainText(`D ${d}`);
});

test("없는 slug 는 404", async ({ page }) => {
  const r = await page.goto("/products/nope");
  expect(r!.status()).toBe(404);
});
