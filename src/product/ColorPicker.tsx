"use client";

import { colorsOf } from "@/catalog/query";

/** 색 견본 한 줄. 첫 견본이 원래 색이고, 고른 색 이름을 옆에 글로 적는다 */
export function ColorPicker({ slug, color, onChange }: { slug: string; color: string; onChange: (id: string) => void }) {
  const colors = colorsOf(slug);
  if (colors.length === 0) return null;
  const selected = colors.find((c, i) => (i === 0 ? color === "" : c.id === color)) ?? colors[0];
  return (
    <fieldset className="mt-8">
      <legend className="text-sm">
        <span className="text-muted">색</span> · {selected.label}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {colors.map((c, i) => {
          const on = c.id === selected.id;
          return (
            <button
              key={c.id}
              type="button"
              data-testid={`color-${c.id}`}
              aria-label={c.label}
              aria-pressed={on}
              onClick={() => onChange(i === 0 ? "" : c.id)}
              className={`grid size-11 place-items-center rounded-full border transition-colors ${on ? "border-accent" : "border-transparent hover:border-fg/30"}`}
            >
              <span className="size-7 rounded-full ring-1 ring-fg/15" style={{ background: c.swatch }} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
