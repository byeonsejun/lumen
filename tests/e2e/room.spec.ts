import { expect, test, type Page } from "@playwright/test";

/** 브라우저 장바구니를 채우고 내 방을 연다 (로그인 없이) */
async function openRoom(page: Page, lines: { slug: string; quantity: number; color?: string }[], query = "renderer=webgl2&tier=1") {
  await page.goto("/");
  await page.evaluate((l) => {
    localStorage.setItem("lumen-cart", JSON.stringify({ state: { lines: l }, version: 1 }));
    localStorage.removeItem("lumen-room");
  }, lines);
  await page.goto(`/room?${query}`);
}
const num = async (page: Page, id: string, attr: string) => Number(await page.getByTestId(id).getAttribute(attr));
const SOFA = "room-item-ember-sofa|#0";

test("빈 장바구니면 빈 방과 가구 더하기", async ({ page }) => {
  await openRoom(page, []);
  await expect(page.getByRole("heading", { name: "내 방에 놓아 보기" })).toBeVisible();
  await expect(page.getByText("아직 놓인 가구가 없어요")).toBeVisible();
  await expect(page.getByTestId("room-add")).toBeVisible();
});

test("가구 더하기로 담으면 장바구니 수가 늘고 목록에 생긴다", async ({ page }) => {
  await openRoom(page, []);
  await page.getByTestId("room-add").click();
  await page.getByTestId("room-add-orbit-coffee-table").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(page.getByTestId("room-item-orbit-coffee-table|#0")).toBeVisible();
});

test("키보드로 옮기면 위치가 바뀌고 벽에서 멈춘다", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }]);
  await page.getByTestId(SOFA).click();
  const width = Number(await page.getByTestId("room-size-width").inputValue());
  const x0 = await num(page, SOFA, "data-x");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => num(page, SOFA, "data-x")).toBeCloseTo(x0 + 0.1, 5);
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
  await expect.poll(() => num(page, SOFA, "data-x")).toBeCloseTo(width / 2 - 1.807 / 2, 2);
});

test("Q 로 돌리면 data-rot 이 90 씩", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }]);
  await page.getByTestId(SOFA).click();
  const r0 = await num(page, SOFA, "data-rot");
  await page.keyboard.press("q");
  await expect.poll(() => num(page, SOFA, "data-rot")).toBe(r0 + 90);
  await page.getByTestId("room-rotate-right").click();
  await expect.poll(() => num(page, SOFA, "data-rot")).toBe(r0);
});

test("방 크기를 줄이면 가구가 벽 안으로", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }, { slug: "loft-steel-shelf", quantity: 1 }]);
  await page.getByTestId("room-size-width").fill("2.5");
  await page.getByTestId("room-size-width").press("Enter");
  await expect(page.getByTestId("room-size-width")).toHaveValue("2.5");
  for (const id of [SOFA, "room-item-loft-steel-shelf|#0"]) {
    const x = await num(page, id, "data-x");
    expect(Math.abs(x)).toBeLessThanOrEqual(1.25);
  }
});

test("방 크기는 범위 안으로 맞춘다", async ({ page }) => {
  await openRoom(page, []);
  await page.getByTestId("room-size-depth").fill("20");
  await page.getByTestId("room-size-depth").press("Enter");
  await expect(page.getByTestId("room-size-depth")).toHaveValue("8");
});

test("새로고침해도 배치가 남는다 · 처음 배치로 되돌리기", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }]);
  await page.getByTestId(SOFA).click();
  const x0 = await num(page, SOFA, "data-x");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  await expect.poll(() => num(page, SOFA, "data-x")).toBeCloseTo(x0 - 0.3, 5);
  await page.reload();
  await expect.poll(() => num(page, SOFA, "data-x")).toBeCloseTo(x0 - 0.3, 5);
  await page.getByTestId("room-reset").click();
  await expect.poll(() => num(page, SOFA, "data-x")).toBeCloseTo(x0, 5);
});

test("겹치면 목록에 겹쳐요", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }, { slug: "orbit-coffee-table", quantity: 1 }]);
  await page.getByTestId(SOFA).click();
  // 소파를 방 가운데(탁자 자리)까지만 — 더 가면 탁자를 지나 앞벽에 닿는다
  for (let i = 0; i < 30 && (await num(page, SOFA, "data-z")) < -0.05; i++) await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId(SOFA)).toHaveAttribute("data-overlap", "true");
  await expect(page.getByTestId(SOFA)).toContainText("겹쳐요");
});

test("위에서 보기 토글", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }]);
  await page.getByTestId("room-top-view").click();
  await expect(page.getByTestId("room-top-view")).toHaveAttribute("aria-pressed", "true");
});

test.describe("휴대폰", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("빈 곳 탭은 선택 해제 · 페이지는 스크롤되지 않는다", async ({ page }) => {
    await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }]);
    await page.getByTestId(SOFA).click();
    await expect(page.getByTestId(SOFA)).toHaveAttribute("data-selected", "true");
    await page.evaluate(() => window.scrollTo(0, 0));
    const canvas = page.getByTestId("stage-canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByTestId("room-stage")).toHaveAttribute("data-scene", "ready", { timeout: 20_000 }); // 바닥이 붙어야 탭을 받는다
    const box = (await canvas.boundingBox())!;
    await page.touchscreen.tap(box.x + 12, box.y + box.height - 12);
    await expect(page.getByTestId(SOFA)).toHaveAttribute("data-selected", "false");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test("3D 를 못 그리면 안내", async ({ page }) => {
  await openRoom(page, [{ slug: "ember-sofa", quantity: 1 }], "renderer=none");
  await expect(page.getByText("이 기기에서는 3D 를 그릴 수 없어요")).toBeVisible();
  await expect(page.getByRole("link", { name: "장바구니로" }).first()).toBeVisible();
});

test("장바구니에서 내 방으로", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("lumen-cart", JSON.stringify({ state: { lines: [{ slug: "ember-sofa", quantity: 1 }] }, version: 1 })));
  await page.goto("/cart?renderer=none");
  await page.getByRole("link", { name: "내 방 크기로 놓아 보기" }).click();
  await expect(page).toHaveURL(/\/room$/);
  await expect(page.getByTestId(SOFA)).toBeVisible();
});

test("상세에서 내 방에 놓아 보기를 누르면 고른 색으로 담기고 방에 있다", async ({ page }) => {
  await page.goto("/products/velvet-sofa?color=navy");
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "내 방에 놓아 보기" }).click();
  await expect(page).toHaveURL(/\/room$/);
  await expect(page.getByTestId("room-item-velvet-sofa|navy#0")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});
