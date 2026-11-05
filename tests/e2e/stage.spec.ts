import { expect, test } from "@playwright/test";

test("GPU 가 없으면(헤드리스 = 소프트웨어 렌더러) 3D 대신 사진", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("stage-fallback")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("stage-canvas")).toHaveCount(0);
});

test("렌더러를 정해 주면 캔버스, HUD 에 백엔드가 나온다", async ({ page }) => {
  await page.goto("/?debug&renderer=webgl2");
  await expect(page.getByTestId("stage-canvas")).toBeVisible();
  await expect(page.getByTestId("stage-hud")).toContainText("webgl2");
});

test("렌더링 불가면 포스터 이미지", async ({ page }) => {
  await page.goto("/?renderer=none");
  await expect(page.getByTestId("stage-fallback")).toBeVisible();
  await expect(page.getByTestId("stage-canvas")).toHaveCount(0);
});

test("?tier=0 이면 HUD 에 tier 0", async ({ page }) => {
  await page.goto("/?debug&tier=0&renderer=webgl2");
  await expect(page.getByTestId("stage-hud")).toContainText("tier 0");
});
