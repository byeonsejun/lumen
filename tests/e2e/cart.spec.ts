import { expect, test, type Page } from "@playwright/test";
import { getFeatured } from "../../src/catalog/query";
import { cartSettled, loginAsDemo } from "./helpers";

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

test("로그인 상태에서 담은 직후 새로고침해 저장 요청이 끊겨도 담은 것이 남는다", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/products/ember-sofa");
  await cartSettled(page);
  // 서버 액션 요청을 끊어 '담자마자 새로고침' 을 그대로 만든다
  await page.route("**/*", (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
  );
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.unroute("**/*");
  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("1", { timeout: 15_000 });
  await cartSettled(page);
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line-ember-sofa")).toBeVisible();
});

test("로그인 확인 중에 누른 담기가 두 번 들어가지 않는다", async ({ page }) => {
  await loginAsDemo(page);
  // 서버 액션은 서버까지 가되, 응답은 브라우저에 닿지 않게 한다 (응답 전에 새로고침한 것과 같다)
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await route.fetch();
      await route.abort();
    } else await route.fallback();
  });
  // 세션 확인을 늦춰 '로그인 상태인데 아직 모르는' 순간을 길게 만든다 (나중에 등록한 route 가 먼저 받는다)
  await page.route("**/api/auth/session", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto("/products/ember-sofa");
  await page.getByTestId("add-to-cart").click();
  await page.waitForTimeout(3000); // 세션 확인 + (끊긴) 저장 요청이 지나가도록
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.reload();
  await cartSettled(page);
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line-ember-sofa")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("로그인 순간 합치기 응답이 끊겨 다시 보내도 한 번만 합쳐진다", async ({ page }) => {
  await page.goto("/products/ember-sofa");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  // 합치기 요청은 서버까지 가되 응답은 브라우저에 닿지 않게 한다 — 브라우저는 합쳐졌는지 모른 채 장바구니를 들고 있다
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await route.fetch();
      await route.abort();
    } else await route.fallback();
  });
  await loginAsDemo(page, "/products/ember-sofa");
  await page.waitForTimeout(3000);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.reload(); // 다시 열리면 같은 내용 · 같은 번호로 합치기를 다시 보낸다
  await cartSettled(page);
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.reload();
  await cartSettled(page);
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("쇼룸 둘러보기 이름표 옆 + 로 담는다", async ({ page }) => {
  await page.goto("/");
  await scrollShowroom(page, featured.length + 3);
  await expect(page.getByTestId("showroom-explore")).toBeVisible();
  await page.getByTestId(`room-add-${featured[1].slug}`).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

for (const [w, h] of [[1024, 700], [1280, 720], [1440, 900]] as const) {
  test(`둘러보기 이름표와 + 버튼이 서로 겹치지 않는다 (${w}×${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/?renderer=webgl2&tier=1");
    await scrollShowroom(page, featured.length + 3);
    await expect(page.getByTestId("showroom-explore")).toBeVisible();
    const read = () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("[data-testid^=room-add-],[data-testid^=room-hotspot-]")].map((e) => {
          const r = e.getBoundingClientRect();
          return { id: e.dataset.testid!, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
        }),
      );
    // 가구마다 이름표 + 담기 버튼이 다 붙고, 카메라가 둘러보기 자리에 멈출 때까지 (고정 대기는 느린 실행에서 모자랐다)
    let boxes = await read();
    await expect
      .poll(async () => {
        const prev = JSON.stringify(boxes);
        boxes = await read();
        return boxes.length === featured.length * 2 && JSON.stringify(boxes) === prev;
      }, { timeout: 20_000, intervals: [400] })
      .toBe(true);
    const hits: string[] = [];
    for (const a of boxes)
      for (const b of boxes)
        if (a.id < b.id && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) hits.push(`${a.id} × ${b.id}`);
    expect(hits).toEqual([]);
  });
}

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

async function addFromDetail(page: Page, slug: string, qty = 1) {
  await page.goto(`/products/${slug}`);
  if (qty > 1) await page.getByLabel("수량").selectOption(String(qty));
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("status")).toContainText("담았어요");
}

test("담은 가구가 목록과 방에 나온다", async ({ page }) => {
  await addFromDetail(page, "ember-sofa");
  await addFromDetail(page, "orbit-coffee-table");
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line-ember-sofa")).toBeVisible();
  await expect(page.getByTestId("cart-line-orbit-coffee-table")).toBeVisible();
  await expect(page.getByTestId("stage-canvas")).toBeVisible();
  await expect(page.getByTestId("cart-total")).toHaveText("2,430,000원");
});

test("수량을 바꾸면 합계가 바뀐다", async ({ page }) => {
  await addFromDetail(page, "orbit-coffee-table");
  await page.goto("/cart");
  await page.getByTestId("cart-line-orbit-coffee-table").getByRole("button", { name: "수량 늘리기" }).click();
  await expect(page.getByTestId("cart-total")).toHaveText("1,080,000원");
  await page.getByTestId("cart-line-orbit-coffee-table").getByRole("button", { name: "빼기" }).click();
  await expect(page.getByText("아직 담은 가구가 없어요")).toBeVisible();
});

test("목록 행을 누르면 방에서 그 가구가 강조된다", async ({ page }) => {
  await addFromDetail(page, "ember-sofa");
  await addFromDetail(page, "halo-lounge-chair");
  await page.goto("/cart");
  await page.getByTestId("cart-line-halo-lounge-chair").click();
  await expect(page.getByTestId("cart-line-halo-lounge-chair")).toHaveAttribute("data-focused", "true");
  await expect(page.getByTestId("cart-room")).toHaveAttribute("data-focused", "halo-lounge-chair|");
});

test("빈 장바구니", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText("아직 담은 가구가 없어요")).toBeVisible();
  await expect(page.getByRole("link", { name: "쇼룸" })).toBeVisible();
});

test("비로그인 주문하기는 로그인으로", async ({ page }) => {
  await addFromDetail(page, "ember-sofa");
  await page.goto("/cart");
  await page.getByRole("button", { name: "주문하기" }).click();
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcheckout$/);
});

test("렌더링 불가면 방 없이 목록만", async ({ page }) => {
  await addFromDetail(page, "ember-sofa");
  await page.goto("/cart?renderer=none");
  await expect(page.getByTestId("cart-line-ember-sofa")).toBeVisible();
  await expect(page.getByTestId("cart-room")).toHaveCount(0);
});
