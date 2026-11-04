import { Color, type MeshStandardMaterial } from "three";
import { clamp, dot, float, length, max, mix, smoothstep, texture, uv, vec3 } from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

export type Recolor = {
  /** 바꿀 색 (sRGB hex) */
  target: string;
  /** 텍스처에서 바꿀 부분의 대표색 (sRGB hex). 없으면 재질 전체를 바꾼다 (부위가 따로 나뉜 재질) */
  key?: string;
  /** 대표색에서 이만큼(선형 RGB 거리) 안쪽은 다 바꾸고, 두 배 바깥은 그대로 둔다 */
  tolerance?: number;
};

const W = vec3(0.2126, 0.7152, 0.0722);

/**
 * 텍스처 한 장에 천과 나무가 함께 그려진 모델에서 천 부분만 다시 칠한다.
 * 각 점이 대표색에 얼마나 가까운지로 가림막을 만들고, 원래 밝기 비율은 지켜 결 · 주름 · 그늘을 살린다
 */
export function recolorMaterial(src: MeshStandardMaterial, r: Recolor): MeshStandardNodeMaterial {
  const n = new MeshStandardNodeMaterial();
  for (const k of ["map", "normalMap", "normalScale", "roughnessMap", "metalnessMap", "roughness", "metalness", "aoMap", "aoMapIntensity", "emissive", "emissiveMap", "emissiveIntensity", "transparent", "opacity", "alphaTest", "side", "alphaMap", "name"] as const) {
    // @ts-expect-error 같은 이름의 속성을 그대로 옮긴다
    n[k] = src[k] instanceof Color ? src[k].clone() : src[k];
  }
  if (!src.map) {
    n.color = new Color(r.target);
    return n;
  }
  const t = texture(src.map, uv(src.map.channel)).rgb;
  const target = vec3(...new Color(r.target).toArray());
  if (!r.key) {
    // 재질 전체: 원래 밝기를 대표 밝기(0.18)에 맞춰 새 색에 곱한다
    n.colorNode = target.mul(clamp(dot(t, W).div(0.18), 0, 2.5));
    return n;
  }
  const key = vec3(...new Color(r.key).toArray());
  const tol = r.tolerance ?? 0.12;
  const mask = float(1).sub(smoothstep(tol, tol * 2, length(t.sub(key))));
  const ratio = clamp(dot(t, W).div(max(dot(key, W), 0.002)), 0, 3);
  n.colorNode = mix(t, target.mul(ratio), mask);
  return n;
}
