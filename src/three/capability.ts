export type RenderCapability = "webgpu" | "webgl2" | "none";

type Env = {
  gpu?: { requestAdapter(): Promise<unknown | null> };
  createCanvas?: () => HTMLCanvasElement;
  force?: RenderCapability;
};

/**
 * GPU 가 없는 기기도 WebGL2 는 "된다" — 브라우저가 CPU 로 그리는 소프트웨어 렌더러를 내주기 때문이다.
 * 그러면 최저 품질에서도 쇼룸이 7fps 라(헤드리스 SwiftShader 로 쟀다) 3D 대신 사진을 보여 준다
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|lavapipe|basic render driver|software rasterizer/i;
export function isSoftwareRenderer(name: string | null | undefined): boolean {
  return !!name && SOFTWARE_RENDERER.test(name);
}

type Adapter = { isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean } };
type GL = { RENDERER: number; getParameter(p: number): unknown; getExtension(name: string): unknown };

function rendererName(gl: GL): string {
  // 최근 Chrome 은 RENDERER 가 실제 이름을 준다. 아니면 디버그 확장으로
  const ext = gl.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL: number } | null;
  return String((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || "");
}

/**
 * WebGPU 어댑터 → WebGL2 컨텍스트 → 없음 순서로 확인한다. 어댑터 요청 실패(블록리스트 등)는 WebGL2 로 내려간다.
 * 소프트웨어 어댑터 · 렌더러(GPU 없음)는 없는 것으로 본다
 */
export async function detectRenderCapability(env: Env = browserEnv()): Promise<RenderCapability> {
  if (env.force) return env.force;
  if (env.gpu) {
    try {
      const adapter = (await env.gpu.requestAdapter()) as Adapter | null;
      if (adapter && !(adapter.info?.isFallbackAdapter ?? adapter.isFallbackAdapter)) return "webgpu";
    } catch {
      // 아래 WebGL2 확인으로
    }
  }
  const canvas = env.createCanvas?.();
  const gl = canvas?.getContext("webgl2") as GL | null | undefined;
  if (!gl) return "none";
  const software = isSoftwareRenderer(rendererName(gl));
  (gl.getExtension("WEBGL_lose_context") as { loseContext(): void } | null)?.loseContext(); // 확인용 컨텍스트는 바로 돌려준다
  return software ? "none" : "webgl2";
}

export function browserEnv(): Env {
  const gpu = (navigator as Navigator & { gpu?: Env["gpu"] }).gpu;
  return { gpu, createCanvas: () => document.createElement("canvas") };
}

export function forcedCapability(search: URLSearchParams): RenderCapability | undefined {
  const v = search.get("renderer");
  return v === "webgpu" || v === "webgl2" || v === "none" ? v : undefined;
}
