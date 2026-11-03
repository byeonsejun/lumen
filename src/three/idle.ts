/**
 * load 가 끝나고 브라우저가 한가해질 때까지 기다린다(최대 1.5초).
 * 3D 는 이 뒤에 시작한다 — 모듈을 받는 것까지 포함해서. three.js 청크(수백 KB)를 일찍 받으면
 * 느린 휴대폰에서 첫 화면 글자와 네트워크 · CPU 를 다툰다.
 * 이 파일은 three 를 import 하지 않아야 한다(첫 화면 번들에 들어간다)
 */
export function afterFirstPaint(): Promise<void> {
  const loaded =
    document.readyState === "complete" ? Promise.resolve() : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true }));
  return loaded.then(
    () => new Promise<void>((r) => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200))),
  );
}

/** next/dynamic 에 넘기는 Stage3D 로더. 받기 시작하는 시점을 afterFirstPaint 뒤로 미룬다 */
export const loadStage3D = () => afterFirstPaint().then(() => import("./Stage3D")).then((m) => m.Stage3D);
