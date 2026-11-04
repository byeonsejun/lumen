import { expect, test, type Page } from "@playwright/test";
import { loginAsDemo } from "./helpers";

const ACCENT = "rgb(232, 182, 121)";

async function sizes(page: Page, selector: string) {
  return page.$$eval(selector, (els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { name: (e as HTMLElement).innerText.trim() || e.getAttribute("aria-label") || e.tagName, w: Math.round(r.width), h: Math.round(r.height) };
      }),
  );
}

test.describe("휴대폰", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("상단 메뉴는 손가락으로 누르기 넉넉하다 (44×44px 이상)", async ({ page }) => {
    await page.goto("/products?renderer=none");
    const small = (await sizes(page, "header a, header button")).filter((s) => s.w < 44 || s.h < 44);
    expect(small).toEqual([]);
  });

  test("로그인해도 상단 메뉴가 한 줄에 들어간다 (글자가 줄바꿈되지 않는다)", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/products?renderer=none");
    await expect(page.getByRole("link", { name: "내 주문" })).toBeVisible();
    // 글자 줄 수를 센다 — 두 줄로 꺾여도 44px 상자 안에 들어가 높이로는 안 보인다
    const wrapped = await page.$$eval("header a, header button, header span", (els) =>
      els
        .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
        .filter((e) => {
          const r = document.createRange();
          r.selectNodeContents(e);
          return new Set([...r.getClientRects()].map((c) => Math.round(c.top))).size > 1;
        })
        .map((e) => (e as HTMLElement).innerText.trim()),
    );
    expect(wrapped).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test("작은 링크도 WCAG 최소 크기(24×24px)를 넘는다", async ({ page }) => {
  await page.goto("/products/ember-sofa?renderer=none");
  const crumb = await sizes(page, `main a[href^="/products?category="]`);
  expect(crumb.length).toBeGreaterThan(0);
  for (const s of crumb) expect(s.h, s.name).toBeGreaterThanOrEqual(24);
  await page.goto("/cart?renderer=none");
  const empty = await sizes(page, "main a");
  expect(empty.length).toBeGreaterThan(0);
  for (const s of empty) expect(s.h, s.name).toBeGreaterThanOrEqual(24);
});

test("키보드 포커스 링과 글자 선택은 브랜드 색을 쓴다", async ({ page }) => {
  await page.goto("/products?renderer=none");
  await page.keyboard.press("Tab");
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement!);
    return { style: cs.outlineStyle, color: cs.outlineColor };
  });
  expect(ring.style).not.toBe("none");
  expect(ring.color).toBe(ACCENT);
  const selection = await page.evaluate(() => getComputedStyle(document.body, "::selection").backgroundColor);
  expect(selection).toContain("232, 182, 121");
});
