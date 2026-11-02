export type Category = "seating" | "table" | "shelves" | "bed" | "lighting" | "decor";

export const CATEGORY_LABEL: Record<Category, string> = {
  seating: "의자·소파",
  table: "테이블",
  shelves: "선반",
  bed: "침대",
  lighting: "조명",
  decor: "소품",
};

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
};
