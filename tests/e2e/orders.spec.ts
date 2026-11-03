import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import { cartSettled, loginAsDemo } from "./helpers";

config({ path: ".env.local" }); // dev 브랜치에만 쓴다

async function buy(page: Page, slug: string) {
  await page.goto(`/products/${slug}`);
  await page.getByTestId("add-to-cart").click();
  await cartSettled(page);
  await page.goto("/checkout");
  await page.getByLabel("받는 분").fill("변세준");
  await page.getByLabel("연락처").fill("010-0000-0000");
  await page.getByLabel("주소").fill("서울시 어딘가 1");
  await page.getByRole("button", { name: /결제하기/ }).click();
  await expect(page).toHaveURL(/\/complete$/, { timeout: 20_000 });
  return page.url().match(/orders\/(LM[0-9A-Za-z]{20})/)![1];
}

const viewerId = (page: Page) => page.evaluate(async () => (await (await fetch("/api/auth/session")).json()).viewer.id as string);

test("주문 내역엔 결제 완료만", async ({ page }) => {
  await loginAsDemo(page);
  const paid = await buy(page, "ember-sofa");
  // 실패한 주문 하나 — 금액을 바꿔 success 로 돌아온다
  await page.goto("/products/halo-lounge-chair");
  await page.getByTestId("add-to-cart").click();
  await cartSettled(page);
  await page.goto("/checkout");
  await page.getByLabel("받는 분").fill("x");
  await page.getByLabel("연락처").fill("x");
  await page.getByLabel("주소").fill("x");
  await page.route("**/checkout/success?**", (route) => {
    const u = new URL(route.request().url());
    u.searchParams.set("amount", "1");
    return route.continue({ url: u.toString() });
  });
  await page.getByRole("button", { name: /결제하기/ }).click();
  await expect(page).toHaveURL(/reason=amount-mismatch/, { timeout: 20_000 });
  await page.goto("/orders");
  await expect(page.getByTestId("order-row")).toHaveCount(1);
  await expect(page.getByTestId("order-row")).toContainText("Ember 3인 소파");
  await page.getByTestId("order-row").click();
  await expect(page).toHaveURL(new RegExp(`/orders/${paid}$`));
  await expect(page.getByText("카드(시뮬레이션)")).toBeVisible();
});

test("주문이 없으면 빈 안내", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/orders");
  await expect(page.getByText("아직 주문한 가구가 없어요")).toBeVisible();
});

test("남의 주문은 404", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  await loginAsDemo(a);
  const orderId = await buy(a, "ember-sofa");
  const b = await (await browser.newContext()).newPage();
  await loginAsDemo(b);
  expect((await b.goto(`/orders/${orderId}`))!.status()).toBe(404);
  expect((await b.goto(`/orders/${orderId}/complete`))!.status()).toBe(404);
  expect((await b.goto(`/orders/LMnotarealorder000000`))!.status()).toBe(404);
});

test("카탈로그에 없는 상품이 든 옛 주문도 상세가 열린다", async ({ page }) => {
  await loginAsDemo(page);
  const userId = await viewerId(page);
  // 생성된 Prisma 클라이언트는 ESM 전용이라 Playwright(CJS 변환)에서 못 불러온다 — dev 브랜치에 SQL 로 직접 넣는다
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const id = `LMretired${Date.now()}`.slice(0, 22).padEnd(22, "0");
  await sql`INSERT INTO "Order" (id, "userId", status, "totalKRW", "orderName", "recipientName", "recipientPhone", "recipientAddress", method, "paidAt")
            VALUES (${id}, ${userId}::uuid, 'PAID', 990000, 'Retired 의자', 'x', 'x', 'x', '카드', now())`;
  await sql`INSERT INTO "OrderItem" (id, "orderId", "productSlug", "nameSnapshot", "priceSnapshotKRW", quantity)
            VALUES (gen_random_uuid(), ${id}, 'retired-chair', 'Retired 의자', 990000, 1)`;
  await page.goto(`/orders/${id}`);
  await expect(page.getByText("Retired 의자").first()).toBeVisible();
  await page.goto(`/orders/${id}/complete`);
  await expect(page.getByText("주문이 완료됐어요")).toBeVisible();
});
