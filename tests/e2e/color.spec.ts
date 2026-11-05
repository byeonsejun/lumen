import { expect, test } from "@playwright/test";
import { cartSettled, loginAsDemo } from "./helpers";

test("색을 고르면 주소와 선택 상태가 바뀐다", async ({ page }) => {
  await page.goto("/products/velvet-sofa");
  await page.getByTestId("color-navy").click();
  await expect(page).toHaveURL(/color=navy/);
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("color-ivory")).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
});

test("원래 색으로 돌아오면 주소에서 색이 빠진다", async ({ page }) => {
  await page.goto("/products/velvet-sofa?color=navy");
  await page.getByTestId("color-ivory").click();
  await expect(page).not.toHaveURL(/color=/);
});

test("다른 페이지에 갔다 같은 상품으로 돌아오면 고른 색이 남아 있지 않다", async ({ page }) => {
  await page.goto("/products/velvet-sofa");
  await page.getByTestId("color-navy").click();
  await expect(page).toHaveURL(/color=navy/);
  // 화면 안 이동(새로고침 없음) — 전에는 앞에서 고른 네이비가 그대로 남았다
  await page.locator('header a[href="/products"]').click();
  await page.locator('[data-testid=product-card][href="/products/velvet-sofa"]').click();
  await expect(page).toHaveURL(/\/products\/velvet-sofa$/);
  await expect(page.getByTestId("color-ivory")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "false");
});

test("장바구니의 색 줄을 누르면 그 색으로 상세가 열린다", async ({ page }) => {
  await page.goto("/products/velvet-sofa?color=navy");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.goto("/cart?renderer=none");
  await page.getByTestId("cart-line-velvet-sofa-navy").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/products\/velvet-sofa\?color=navy$/);
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
});

test("색 옵션이 없는 상품은 견본이 없다", async ({ page }) => {
  await page.goto("/products/orbit-coffee-table");
  await expect(page.getByTestId("add-to-cart")).toBeVisible();
  await expect(page.locator("[data-testid^=color-]")).toHaveCount(0);
});

test("두 색을 담으면 장바구니에 두 줄 · 색 이름이 보인다", async ({ page }) => {
  await page.goto("/products/velvet-sofa");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.getByTestId("color-navy").click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await page.goto("/cart?renderer=none");
  await expect(page.getByTestId("cart-line-velvet-sofa")).toBeVisible();
  await expect(page.getByTestId("cart-line-velvet-sofa-navy")).toContainText("네이비");
  await expect(page.getByTestId("cart-line-velvet-sofa")).not.toContainText("네이비");
});

test("색을 고른 채 결제하면 주문 상세에 색 이름", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/products/velvet-sofa?color=navy");
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("add-to-cart").click();
  await cartSettled(page);
  await page.goto("/checkout");
  await expect(page.getByText("네이비")).toBeVisible();
  await page.getByLabel("받는 분").fill("데모");
  await page.getByLabel("연락처").fill("010-0000-0000");
  await page.getByLabel("주소").fill("서울");
  await page.getByRole("button", { name: /결제하기/ }).click();
  await expect(page).toHaveURL(/\/orders\/(LM[0-9A-Za-z]{20})\/complete$/, { timeout: 20_000 });
  const id = page.url().match(/orders\/(LM[0-9A-Za-z]{20})/)![1];
  await page.goto(`/orders/${id}`);
  await expect(page.getByText("네이비")).toBeVisible();
});
