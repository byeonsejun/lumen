import { describe, expect, it } from "vitest";
import { showroomTimeline } from "@/showroom/timeline";

// count 4 → 구간 합 intro 1 + 4 + reveal 1.5 + explore 0.5 = 7
describe("showroomTimeline", () => {
  it("0 은 intro", () => expect(showroomTimeline(0, 4)).toEqual({ phase: "intro", t: 0 }));
  it("intro 중간", () => expect(showroomTimeline(0.5 / 7, 4)).toEqual({ phase: "intro", t: 0.5 }));
  it("첫 가구 구간 한가운데", () => expect(showroomTimeline(1.5 / 7, 4)).toEqual({ phase: "spotlight", index: 0, t: 0.5 }));
  it("마지막 가구 구간", () => expect(showroomTimeline(4.5 / 7, 4)).toMatchObject({ phase: "spotlight", index: 3 }));
  it("마지막 가구 다음은 reveal", () => expect(showroomTimeline(5.2 / 7, 4).phase).toBe("reveal"));
  it("reveal 진행도", () => expect(showroomTimeline(5.75 / 7, 4)).toEqual({ phase: "reveal", t: 0.5 }));
  it("끝은 explore", () => expect(showroomTimeline(1, 4)).toEqual({ phase: "explore" }));
  it("범위 밖 clamp", () => {
    expect(showroomTimeline(-1, 4).phase).toBe("intro");
    expect(showroomTimeline(2, 4)).toEqual({ phase: "explore" });
  });
});
