import { ACESFilmicToneMapping } from "three";
import { WebGPURenderer } from "three/webgpu";
type DefaultGLProps = { canvas?: unknown };

/**
 * R3F `gl` 콜백. WebGPURenderer 하나로 그리고, WebGPU 가 안 되는 환경에선 forceWebGL 로 WebGL2 백엔드를 쓴다.
 * 그래서 셰이더는 노드 머티리얼·TSL 만 쓴다 (GLSL ShaderMaterial 금지 — 계획 Global Constraints)
 */
export function createRenderer(cap: "webgpu" | "webgl2") {
  return async (props: DefaultGLProps) => {
    const renderer = new WebGPURenderer({
      canvas: props.canvas as HTMLCanvasElement,
      antialias: true,
      alpha: false,
      forceWebGL: cap === "webgl2",
    });
    await renderer.init();
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    return renderer;
  };
}

export function rendererBackend(renderer: unknown): "webgpu" | "webgl2" {
  const backend = (renderer as { backend?: { isWebGPUBackend?: boolean } }).backend;
  return backend?.isWebGPUBackend ? "webgpu" : "webgl2";
}
