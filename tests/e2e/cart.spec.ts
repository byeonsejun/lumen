import { expect, test, type Page } from "@playwright/test";
import { getFeatured } from "../../src/catalog/query";
import { loginAsDemo } from "./helpers";

const featured = getFeatured();

async function scrollShowroom(page: Page, at: number) {
  await page.evaluate(([at, n]) => {
    const s = document.querySelector("[data-testid=showroom]") as HTMLElement;
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + (s.offsetHeight - window.innerHeight) * (at / (n + 3)));
  }, [at, featured.length]);
}

test("상세에서 수량 2 로 담으면 배지 2 와 토스트", async ({ page }) => {
  await page.goto("/products/ember-sofa");
  await page.getByLabel("수량").selectOption("2");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await expect(page.getByRole("status")).toContainText("담았어요");
});

test("쇼룸 오버레이에서 담고 새로고침해도 남는다", async ({ page }) => {
  await page.goto("/");
  await scrollShowroom(page, 1.5);
  await page.getByTestId("showroom-overlay").getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("쇼룸 둘러보기 이름표 옆 + 로 담는다", async ({ page }) => {
  await page.goto("/");
  await scrollShowroom(page, featured.length + 3);
  await expect(page.getByTestId("showroom-explore")).toBeVisible();
  await page.getByTestId(`room-add-${featured[1].slug}`).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("로그인 전에 담은 가구가 데모 로그인 뒤에도 남는다", async ({ page }) => {
  await page.goto("/products/ember-sofa");
  await page.getByLabel("수량").selectOption("2");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await loginAsDemo(page);
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("2");
});
