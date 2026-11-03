import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers";

test("데모 계정으로 로그인하면 헤더에 데모 계정과 내 주문", async ({ page }) => {
  await loginAsDemo(page);
  await expect(page.getByRole("link", { name: "내 주문" })).toBeVisible();
});

test("로그인 뒤 callbackUrl 로 돌아온다 (같은 사이트 경로만)", async ({ page }) => {
  await loginAsDemo(page, "/products");
  await expect(page).toHaveURL(/\/products$/);
});

test("로그아웃하면 다시 로그인 링크", async ({ page }) => {
  await loginAsDemo(page);
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
});

test("쇼룸과 상품 상세는 여전히 정적으로 만들어진다", () => {
  const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8")) as { routes: Record<string, unknown> };
  expect(Object.keys(manifest.routes)).toEqual(expect.arrayContaining(["/", "/products/ember-sofa"]));
});
