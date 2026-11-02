import { expect, test } from "@playwright/test";

test("홈이 다크 배경과 Poly Haven 출처를 보여준다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('footer a[href*="polyhaven.com"]')).toBeVisible();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(11, 10, 9)");
});
