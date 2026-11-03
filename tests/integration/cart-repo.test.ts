import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoUser } from "@/server/users";
import { mergeIntoCart, readCart, subtractOrdered, writeLine } from "@/cart/repo";
import { track } from "./helpers";

const session = vi.hoisted(() => ({ current: null as null | { viewer: { id: string; name: string | null; isDemo: boolean } } }));
vi.mock("@/auth", () => ({ auth: async () => session.current }));

let u: string;
beforeEach(async () => {
  u = track(await createDemoUser()).id;
  session.current = null;
});

describe("cart repo", () => {
  it("담고 읽기 · 수량 clamp · 0 이면 삭제 · 모르는 상품 무시", async () => {
    await writeLine(u, "ember-sofa", 12);
    await writeLine(u, "ghost", 1);
    await writeLine(u, "halo-lounge-chair", 2);
    expect(await readCart(u)).toEqual([
      { slug: "ember-sofa", quantity: 9 },
      { slug: "halo-lounge-chair", quantity: 2 },
    ]);
    await writeLine(u, "halo-lounge-chair", 0);
    expect(await readCart(u)).toEqual([{ slug: "ember-sofa", quantity: 9 }]);
  });

  it("수량을 바꿔도 줄 순서는 담은 순서 그대로", async () => {
    await writeLine(u, "ember-sofa", 1);
    await writeLine(u, "halo-lounge-chair", 1);
    await writeLine(u, "ember-sofa", 3);
    expect((await readCart(u)).map((l) => l.slug)).toEqual(["ember-sofa", "halo-lounge-chair"]);
  });

  it("로그인 순간 합치기는 9 에서 자른다", async () => {
    await writeLine(u, "ember-sofa", 6);
    expect(await mergeIntoCart(u, [{ slug: "ember-sofa", quantity: 5 }, { slug: "ghost", quantity: 1 }])).toEqual([{ slug: "ember-sofa", quantity: 9 }]);
  });

  it("주문한 수량만 뺀다", async () => {
    await writeLine(u, "ember-sofa", 3);
    await writeLine(u, "halo-lounge-chair", 1);
    await subtractOrdered(u, [{ slug: "ember-sofa", quantity: 2 }, { slug: "halo-lounge-chair", quantity: 1 }]);
    expect(await readCart(u)).toEqual([{ slug: "ember-sofa", quantity: 1 }]);
  });
});

describe("cart actions", () => {
  it("로그인 안 했으면 signed-out", async () => {
    const { getCartAction } = await import("@/cart/actions");
    expect(await getCartAction()).toEqual({ ok: false, reason: "signed-out" });
  });

  it("정리돼 사라진 사용자 세션이면 500 이 아니라 signed-out", async () => {
    session.current = { viewer: { id: "0190f0a0-0000-7000-8000-000000000000", name: null, isDemo: true } };
    const { addToCartAction } = await import("@/cart/actions");
    expect(await addToCartAction("ember-sofa", 1)).toEqual({ ok: false, reason: "signed-out" });
  });

  it("로그인했으면 담고 결과 줄을 돌려준다", async () => {
    session.current = { viewer: { id: u, name: "데모 손님", isDemo: true } };
    const { addToCartAction } = await import("@/cart/actions");
    expect(await addToCartAction("ember-sofa", 2)).toEqual({ ok: true, lines: [{ slug: "ember-sofa", quantity: 2 }] });
  });
});
