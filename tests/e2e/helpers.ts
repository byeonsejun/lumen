import { expect, type Page } from "@playwright/test";

/** /login 의 데모 버튼으로 로그인한다. 브라우저 컨텍스트마다 새 임시 계정 */
export async function loginAsDemo(page: Page, callbackUrl?: string) {
  await page.goto(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  await page.getByRole("button", { name: "데모 계정으로 체험하기" }).click();
  await expect(page.getByText("데모 계정", { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** 장바구니 저장이 서버까지 끝났는지(로그인 상태) — 바로 다른 페이지로 이동하면 진행 중인 요청이 끊긴다 */
export async function cartSettled(page: Page) {
  await expect(page.getByTestId("cart-link")).not.toHaveAttribute("data-sync", "syncing", { timeout: 15_000 });
}
