import { expect, test } from "@playwright/test";

test("기본은 캔버스, HUD 에 백엔드가 나온다", async ({ page }) => {
  await page.goto("/?debug");
  await expect(page.getByTestId("stage-canvas")).toBeVisible();
  await expect(page.getByTestId("stage-hud")).toContainText(/webgpu|webgl2/);
});

test("렌더링 불가면 포스터 이미지", async ({ page }) => {
  await page.goto("/?renderer=none");
  await expect(page.getByTestId("stage-fallback")).toBeVisible();
  await expect(page.getByTestId("stage-canvas")).toHaveCount(0);
});

test("?tier=0 이면 HUD 에 tier 0", async ({ page }) => {
  await page.goto("/?debug&tier=0");
  await expect(page.getByTestId("stage-hud")).toContainText("tier 0");
});

test("WebGL2 강제 시 webgl2 백엔드로 그린다", async ({ page }) => {
  await page.goto("/?debug&renderer=webgl2");
  await expect(page.getByTestId("stage-hud")).toContainText("webgl2");
});
