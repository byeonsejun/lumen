/**
 * Poly Haven 모델은 단위 · 앞방향이 제각각이다(Loft 스틸 선반은 10배, Grid 선반은 옆면이 앞).
 * 상품 치수(가로 · 높이 · 깊이 mm)와 실제 바운딩 박스를 비교해 크기와 방향을 맞춘다.
 */
export function fitTransform(box: { x: number; y: number; z: number }, dimensionsMm: readonly [number, number, number]): { scale: number; rotateY: number } {
  const [w, h, d] = dimensionsMm.map((v) => v / 1000);
  const ratio = h / box.y;
  // 10% 안쪽 오차는 원본 그대로 둔다 — 치수 표기와 메시 경계의 작은 차이까지 고치면 오히려 흔들린다
  const scale = Math.abs(ratio - 1) <= 0.1 ? 1 : ratio;
  const bx = box.x * scale;
  const bz = box.z * scale;
  const asIs = Math.abs(bx - w) + Math.abs(bz - d);
  const turned = Math.abs(bz - w) + Math.abs(bx - d);
  return { scale, rotateY: turned + 0.05 < asIs ? Math.PI / 2 : 0 };
}
