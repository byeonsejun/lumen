import { describe, expect, it } from "vitest";
import { detectRenderCapability } from "@/three/capability";

const fakeCanvas = ({ webgl2 }: { webgl2: boolean }) =>
  ({ getContext: (kind: string) => (kind === "webgl2" && webgl2 ? {} : null) }) as unknown as HTMLCanvasElement;

describe("detectRenderCapability", () => {
  it("어댑터가 있으면 webgpu", async () =>
    expect(
      await detectRenderCapability({ gpu: { requestAdapter: async () => ({}) }, createCanvas: () => fakeCanvas({ webgl2: true }) }),
    ).toBe("webgpu"));
  it("어댑터가 null 이면 webgl2", async () =>
    expect(
      await detectRenderCapability({ gpu: { requestAdapter: async () => null }, createCanvas: () => fakeCanvas({ webgl2: true }) }),
    ).toBe("webgl2"));
  it("requestAdapter 가 throw 해도 webgl2", async () =>
    expect(
      await detectRenderCapability({
        gpu: { requestAdapter: async () => { throw new Error("blocked"); } },
        createCanvas: () => fakeCanvas({ webgl2: true }),
      }),
    ).toBe("webgl2"));
  it("gpu 없고 webgl2 도 없으면 none", async () =>
    expect(await detectRenderCapability({ createCanvas: () => fakeCanvas({ webgl2: false }) })).toBe("none"));
  it("강제 지정이 있으면 따른다", async () =>
    expect(
      await detectRenderCapability({ gpu: { requestAdapter: async () => ({}) }, createCanvas: () => fakeCanvas({ webgl2: true }), force: "none" }),
    ).toBe("none"));
});
