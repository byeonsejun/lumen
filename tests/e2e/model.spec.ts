import { expect, test } from "@playwright/test";
import { getFeatured } from "../../src/catalog/query";

test("홈의 대표 가구 모델 1k 를 받는다", async ({ page }) => {
  const res = page.waitForResponse((r) => /\/models\/sofa_02\/1k\.glb$/.test(r.url()));
  await page.goto("/?renderer=webgl2");
  expect((await res).status()).toBe(200);
});

test("모델을 못 받아도 페이지가 깨지지 않고 포스터로 대체한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/models/**", (r) => r.abort());
  await page.goto("/?renderer=webgl2");
  await expect(page.getByTestId("stage-canvas")).toBeVisible();
  await expect(page.getByTestId("model-fallback")).toHaveCount(getFeatured().length);
  expect(errors).toEqual([]);
});
