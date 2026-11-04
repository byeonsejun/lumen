export type Category = "seating" | "table" | "shelves" | "bed" | "lighting" | "decor";

export const CATEGORY_LABEL: Record<Category, string> = {
  seating: "의자·소파",
  table: "테이블",
  shelves: "선반",
  bed: "침대",
  lighting: "조명",
  decor: "소품",
};

/** 텍스처에서 천 부분만 다시 칠하는 설정 — src/three/recolor.ts 가 그린다 */
export type Recolor = {
  /** 바꿀 색 (sRGB hex). 원래 밝기 비율을 곱하므로 결과의 가운데 색이 이 색 근처가 된다 */
  target: string;
  /** 텍스처에서 바꿀 부분의 대표색 (sRGB hex). 없으면 재질 전체 */
  key?: string;
  /** 대표색에서 이만큼(선형 RGB 거리) 안쪽은 다 바꾸고, 두 배 바깥은 그대로 */
  tolerance?: number;
  /** 있으면 이름에 이 글자가 든 재질만 바꾼다 (부위가 따로 나뉜 모델) */
  material?: string;
};

/** 색 옵션. 첫 항목은 원래 색이라 recolor 가 없다 */
export type ColorOption = { id: string; label: string; swatch: string; recolor?: Recolor };

export type Product = {
  slug: string;
  name: string;
  category: Category;
  priceKRW: number;
  description: string;
  material: string;
  /** Poly Haven 모델 ID — https://polyhaven.com/a/{id} */
  polyhavenId: string;
  /** 가로 · 높이 · 깊이 (mm). Poly Haven `dimensions` 는 [가로, 깊이, 높이] 라 순서를 바꿔 적는다 */
  dimensionsMm: [w: number, h: number, d: number];
  featuredOrder?: number;
  /** 천 · 가죽 가구만. 고른 색은 장바구니 · 주문까지 따라간다 */
  colors?: ColorOption[];
};
