import { expect, test } from "@playwright/test";
import { formatPrice, getProducts } from "../../src/catalog/query";

const p = getProducts()[0];

test("상세에 이름·가격·출처가 있다", async ({ page }) => {
  await page.goto(`/products/${p.slug}`);
  await expect(page.getByRole("heading", { name: p.name })).toBeVisible();
  await expect(page.getByText(formatPrice(p.priceKRW))).toBeVisible();
  await expect(page.locator(`a[href="https://polyhaven.com/a/${p.polyhavenId}"]`)).toBeVisible();
  await expect(page.getByTestId("add-to-cart")).toBeEnabled(); // 2차: 비활성 버튼을 살렸다
});

test("3D 뷰어와 치수 토글", async ({ page }) => {
  await page.goto(`/products/${p.slug}?renderer=webgl2`);
  await expect(page.getByTestId("stage-canvas")).toBeVisible();
  await page.getByRole("button", { name: "치수 보기" }).click();
  await expect(page.getByTestId("dimension-label")).toHaveCount(3);
  const [w, h, d] = p.dimensionsMm.map((v) => Math.round(v).toLocaleString("ko-KR"));
  await expect(page.getByTestId("dimension-label").nth(0)).toContainText(`W ${w}`);
  await expect(page.getByTestId("dimension-label").nth(1)).toContainText(`H ${h}`);
  await expect(page.getByTestId("dimension-label").nth(2)).toContainText(`D ${d}`);
});

test("없는 slug 는 404", async ({ page }) => {
  const r = await page.goto("/products/nope");
  expect(r!.status()).toBe(404);
});

// 3D 코드(three.js)는 수백 KB 다. 첫 화면이 그려지기 전에 받기 시작하면 느린 휴대폰에서 글자와 경쟁한다
for (const path of ["/products/ember-sofa", "/"]) {
  test(`${path} 는 three.js 청크를 load 뒤에 받기 시작한다`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId("stage-canvas").or(page.getByTestId("stage-fallback")).first()).toBeAttached({ timeout: 20_000 });
    // 브라우저 안의 시각으로 비교한다 (Node 쪽 이벤트 수신 시각은 밀릴 수 있다)
    const { loadAt, scripts } = await page.evaluate(() => ({
      loadAt: (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).loadEventStart,
      scripts: performance
        .getEntriesByType("resource")
        .filter((e) => (e as PerformanceResourceTiming).initiatorType === "script")
        .map((e) => ({ url: e.name, at: e.startTime })),
    }));
    const three = [];
    for (const s of scripts) {
      const body = await page.evaluate((u) => fetch(u).then((res) => res.text()), s.url);
      if (body.includes("WebGPURenderer")) three.push(s);
    }
    expect(three.length).toBeGreaterThan(0);
    for (const s of three) expect(s.at, s.url).toBeGreaterThanOrEqual(loadAt);
  });
}
