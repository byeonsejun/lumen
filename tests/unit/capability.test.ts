import { describe, expect, it } from "vitest";
import { detectRenderCapability } from "@/three/capability";

const fakeCanvas = ({ webgl2, renderer = "Apple M1" }: { webgl2: boolean; renderer?: string }) =>
  ({
    getContext: (kind: string) =>
      kind === "webgl2" && webgl2 ? { RENDERER: 0x1f01, getParameter: (p: number) => (p === 0x1f01 ? renderer : null), getExtension: () => null } : null,
  }) as unknown as HTMLCanvasElement;

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

  it("WebGL2 가 소프트웨어 렌더러(GPU 없음)면 none — 사진으로 보여 준다", async () => {
    for (const renderer of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)",
    ])
      expect(await detectRenderCapability({ createCanvas: () => fakeCanvas({ webgl2: true, renderer }) })).toBe("none");
  });
  it("WebGPU 어댑터가 소프트웨어(fallback)면 WebGL2 를 본다", async () => {
    const soft = { info: { isFallbackAdapter: true } };
    expect(await detectRenderCapability({ gpu: { requestAdapter: async () => soft }, createCanvas: () => fakeCanvas({ webgl2: true }) })).toBe("webgl2");
    expect(
      await detectRenderCapability({ gpu: { requestAdapter: async () => soft }, createCanvas: () => fakeCanvas({ webgl2: true, renderer: "SwiftShader" }) }),
    ).toBe("none");
  });
});
