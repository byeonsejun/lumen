import { expect, test, type Page } from "@playwright/test";
import { cartSettled, loginAsDemo } from "./helpers";

async function add(page: Page, slug: string) {
  await page.goto(`/products/${slug}`);
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("status")).toContainText("담았어요");
  await cartSettled(page);
}

export async function fillAndPay(page: Page) {
  await page.getByLabel("받는 분").fill("변세준");
  await page.getByLabel("연락처").fill("010-0000-0000");
  await page.getByLabel("주소").fill("서울시 어딘가 1");
  await page.getByRole("button", { name: /결제하기/ }).click();
}

test("데모로 담기 → 장바구니 → 주문서 → 결제 → 완료 화면", async ({ page }) => {
  await loginAsDemo(page);
  await add(page, "ember-sofa");
  await add(page, "orbit-coffee-table");
  await page.goto("/cart");
  await page.getByRole("button", { name: "주문하기" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("테스트 결제입니다. 실제 배송되지 않아요")).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("2,430,000원");
  await fillAndPay(page);
  await expect(page).toHaveURL(/\/orders\/LM[0-9A-Za-z]{20}\/complete$/, { timeout: 20_000 });
  await expect(page.getByTestId("cart-count")).toHaveCount(0);
});

test("비로그인으로 주문서에 오면 로그인으로", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcheckout$/);
});

test("결제 실패 화면에서 장바구니는 그대로", async ({ page }) => {
  await loginAsDemo(page);
  await add(page, "ember-sofa");
  await page.goto("/checkout/fail?code=PAY_PROCESS_CANCELED&message=%EC%82%AC%EC%9A%A9%EC%9E%90%EA%B0%80%20%EA%B2%B0%EC%A0%9C%EB%A5%BC%20%EC%B7%A8%EC%86%8C%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4");
  await expect(page.getByText("사용자가 결제를 취소했습니다")).toBeVisible();
  await page.getByRole("link", { name: "장바구니로 돌아가기" }).click();
  await expect(page.getByTestId("cart-line-ember-sofa")).toBeVisible();
});

test("금액을 바꾼 success 주소는 승인하지 않는다", async ({ page }) => {
  await loginAsDemo(page);
  await add(page, "ember-sofa");
  await page.goto("/checkout");
  // 결제창으로 가는 대신 주문만 만들고 금액을 1원으로 바꿔 돌아온다
  await page.getByLabel("받는 분").fill("변세준");
  await page.getByLabel("연락처").fill("010-0000-0000");
  await page.getByLabel("주소").fill("서울시 어딘가 1");
  await page.route("**/checkout/success?**", async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("amount", "1");
    await route.continue({ url: url.toString() });
  });
  await page.getByRole("button", { name: /결제하기/ }).click();
  await expect(page).toHaveURL(/\/checkout\/fail\?reason=amount-mismatch/, { timeout: 20_000 });
  await expect(page.getByText("결제 금액이 주문과 달라")).toBeVisible();
});

test("주문서에는 3D 가 없다", async ({ page }) => {
  await loginAsDemo(page);
  await add(page, "ember-sofa");
  await page.goto("/checkout");
  await expect(page.getByTestId("checkout-total")).toBeVisible();
  await expect(page.getByTestId("stage-canvas")).toHaveCount(0);
});
