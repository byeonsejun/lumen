import { describe, expect, it } from "vitest";
import { addLine, cartCount, mergeLines, removeLine, setLine } from "@/cart/lines";

describe("cart lines", () => {
  it("담으면 뒤에 붙고, 같은 상품은 더한다", () => {
    const a = addLine([], "ember-sofa");
    expect(addLine(addLine(a, "halo-lounge-chair", 2), "ember-sofa", 3)).toEqual([
      { slug: "ember-sofa", quantity: 4 },
      { slug: "halo-lounge-chair", quantity: 2 },
    ]);
  });
  it("9 에서 자른다", () => expect(addLine([{ slug: "ember-sofa", quantity: 8 }], "ember-sofa", 5)).toEqual([{ slug: "ember-sofa", quantity: 9 }]));
  it("수량 지정은 1~9 clamp", () => {
    expect(setLine([{ slug: "ember-sofa", quantity: 2 }], "ember-sofa", 0)).toEqual([{ slug: "ember-sofa", quantity: 1 }]);
    expect(setLine([{ slug: "ember-sofa", quantity: 2 }], "ember-sofa", 20)).toEqual([{ slug: "ember-sofa", quantity: 9 }]);
  });
  it("빼기", () => expect(removeLine([{ slug: "ember-sofa", quantity: 2 }], "ember-sofa")).toEqual([]));
  it("모르는 상품은 담지 않는다", () => expect(addLine([], "ghost")).toEqual([]));
  it("합치면 같은 상품은 더하고 9 에서 자른다", () =>
    expect(mergeLines([{ slug: "ember-sofa", quantity: 6 }], [{ slug: "ember-sofa", quantity: 5 }, { slug: "halo-lounge-chair", quantity: 1 }])).toEqual([
      { slug: "ember-sofa", quantity: 9 },
      { slug: "halo-lounge-chair", quantity: 1 },
    ]));
  it("모르는 slug 는 합칠 때 버린다", () => expect(mergeLines([], [{ slug: "ghost", quantity: 1 }])).toEqual([]));
  it("개수", () => expect(cartCount([{ slug: "a", quantity: 2 }, { slug: "b", quantity: 3 }])).toBe(5));
});
