import { expect, test } from "@playwright/test";

test("개인정보처리방침 페이지가 열리고 푸터에서 갈 수 있다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "개인정보처리방침" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "개인정보처리방침" })).toBeVisible();
  await expect(page.getByText("24시간")).toBeVisible();
});
