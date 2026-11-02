import type { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<Group>>();

/**
 * Suspense 를 쓰지 않는 로더. R3F 는 오류 경계에서 잡힌 오류도 reportError 로 전역 보고하므로,
 * 실패를 promise 로 돌려받아 컴포넌트가 직접 포스터로 바꾼다. 실패한 URL 은 캐시에서 빼 재시도할 수 있게 한다
 */
export function loadModel(url: string): Promise<Group> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((gltf) => gltf.scene);
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}
