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
  // 로그아웃 뒤 무거운 쇼룸(/)으로 이동한다 — 병렬 실행 중엔 5초를 넘길 때가 있다
  await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible({ timeout: 15_000 });
});

test("로그인이 필요한 주소의 응답은 세션 쿠키를 다시 심지 않는다", async ({ page }) => {
  // 헤더의 '내 주문' 프리패치가 로그아웃보다 늦게 도착하면, 이 쿠키가 방금 지운 세션을 되살려 로그아웃이 안 됐다
  await loginAsDemo(page);
  for (const path of ["/orders", "/checkout"]) {
    const res = await page.request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
    const refreshed = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie" && /session-token/.test(h.value));
    expect(refreshed, path).toEqual([]);
  }
});

test("쇼룸과 상품 상세는 여전히 정적으로 만들어진다", () => {
  const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8")) as { routes: Record<string, unknown> };
  expect(Object.keys(manifest.routes)).toEqual(expect.arrayContaining(["/", "/products/ember-sofa"]));
});
