import { expect, test } from "@playwright/test";

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

test("색 옵션이 없는 상품은 견본이 없다", async ({ page }) => {
  await page.goto("/products/orbit-coffee-table");
  await expect(page.getByTestId("add-to-cart")).toBeVisible();
  await expect(page.locator("[data-testid^=color-]")).toHaveCount(0);
});
