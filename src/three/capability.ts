export type RenderCapability = "webgpu" | "webgl2" | "none";

type Env = {
  gpu?: { requestAdapter(): Promise<unknown | null> };
  createCanvas?: () => HTMLCanvasElement;
  force?: RenderCapability;
};

/** WebGPU 어댑터 → WebGL2 컨텍스트 → 없음 순서로 확인한다. 어댑터 요청 실패(블록리스트 등)는 WebGL2 로 내려간다 */
export async function detectRenderCapability(env: Env = browserEnv()): Promise<RenderCapability> {
  if (env.force) return env.force;
  if (env.gpu) {
    try {
      if (await env.gpu.requestAdapter()) return "webgpu";
    } catch {
      // 아래 WebGL2 확인으로
    }
  }
  const canvas = env.createCanvas?.();
  return canvas?.getContext("webgl2") ? "webgl2" : "none";
}

export function browserEnv(): Env {
  const gpu = (navigator as Navigator & { gpu?: Env["gpu"] }).gpu;
  return { gpu, createCanvas: () => document.createElement("canvas") };
}

export function forcedCapability(search: URLSearchParams): RenderCapability | undefined {
  const v = search.get("renderer");
  return v === "webgpu" || v === "webgl2" || v === "none" ? v : undefined;
}
