import { expect, test, type Page } from "@playwright/test";
import { getFeatured } from "../../src/catalog/query";

const featured = getFeatured();
const segments = featured.length + 3;

async function scrollToSegment(page: Page, at: number) {
  await page.evaluate(
    ([at, segments]) => {
      const s = document.querySelector("[data-testid=showroom]") as HTMLElement;
      const top = s.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (s.offsetHeight - window.innerHeight) * (at / segments));
    },
    [at, segments],
  );
}

test("스크롤하면 featured 가구 이름이 차례로 나온다", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < featured.length; i++) {
    await scrollToSegment(page, 1.5 + i);
    await expect(page.getByTestId("showroom-overlay")).toContainText(featured[i].name);
  }
});

test("오버레이의 자세히 링크는 상세로 간다", async ({ page }) => {
  await page.goto("/");
  await scrollToSegment(page, 1.5);
  await expect(page.getByTestId("showroom-overlay").getByRole("link", { name: /자세히/ })).toHaveAttribute(
    "href",
    `/products/${featured[0].slug}`,
  );
});

test("렌더링 불가 환경에서도 쇼룸 정보는 읽힌다", async ({ page }) => {
  await page.goto("/?renderer=none");
  await scrollToSegment(page, 1.5);
  await expect(page.getByTestId("showroom-overlay")).toContainText(featured[0].name);
});
