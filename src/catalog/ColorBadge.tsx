import { colorOption } from "./query";

/** 상품 이름 옆의 색 표시 — 견본 점 + 이름. 원래 색이면 아무것도 그리지 않는다 */
export function ColorBadge({ slug, color, label }: { slug: string; color?: string; label?: string | null }) {
  const opt = color ? colorOption(slug, color) : undefined;
  const name = label ?? opt?.label;
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden className="size-2.5 rounded-full ring-1 ring-fg/20" style={{ background: opt?.swatch ?? "transparent" }} />
      {name}
    </span>
  );
}
