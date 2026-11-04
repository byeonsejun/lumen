"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColorBadge } from "@/catalog/ColorBadge";
import { getProduct } from "@/catalog/query";
import { useCart } from "@/cart/useCart";
import { loadStage3D } from "@/three/idle";
import { posterUrl } from "@/three/models";
import { useQuality } from "@/three/quality/store";
import { AddFurnitureDrawer } from "./AddFurnitureDrawer";
import { arrangeRoom, type Placement } from "./arrange";
import type { PlannedItem } from "./PlannerScene";
import { arrangeInto, clampSize, DEFAULT_HEIGHT, moveTo, overlapping, placementKey, reconcile, ROOM_LIMITS, rotate, shrinkRoom, surfaceY, type RoomSize } from "./planner";
import { useRoomStore } from "./useRoomStore";

const Stage3D = dynamic(loadStage3D, { ssr: false });
const PlannerScene = dynamic(() => import("./PlannerScene").then((m) => m.PlannerScene), { ssr: false });

const STEP = 0.1;
const BIG_STEP = 0.5;
const deg = (r: number) => Math.round((r * 180) / Math.PI);

export function RoomPlanner() {
  const cart = useCart();
  const store = useRoomStore();
  const noRender = useQuality((s) => s.backend === "none");
  const [adding, setAdding] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);

  const items = useMemo(
    () => cart.lines.flatMap((l) => (getProduct(l.slug) ? [{ product: getProduct(l.slug)!, quantity: l.quantity, color: l.color }] : [])),
    [cart.lines],
  );
  // 처음엔 자동 배치가 정한 크기(넘치면 8m 에서 자른다)
  const size: RoomSize = useMemo(() => {
    if (store.size) return store.size;
    const auto = arrangeRoom(items);
    return clampSize({ width: auto.width, depth: auto.depth, height: DEFAULT_HEIGHT });
  }, [store.size, items]);
  const fresh = useMemo(() => arrangeInto(items, size), [items, size]);
  const placements = useMemo(() => reconcile(store.placements, fresh), [store.placements, fresh]);
  const overlaps = useMemo(() => overlapping(placements), [placements]);
  const planned: PlannedItem[] = useMemo(
    () => placements.map((p) => ({ ...p, key: placementKey(p), y: p.level === "ceiling" ? p.position[1] : surfaceY(p, placements) })),
    [placements],
  );
  const selected = store.selected && planned.some((p) => p.key === store.selected) ? store.selected : null;

  const update = useCallback(
    (key: string, f: (p: Placement) => Placement) => {
      const s = useRoomStore.getState();
      const base = reconcile(s.placements, fresh);
      s.setPlacements(base.map((p) => (placementKey(p) === key ? f(p) : p)));
    },
    [fresh],
  );
  const onMove = useCallback((key: string, x: number, z: number) => update(key, (p) => moveTo(p, x, z, size)), [update, size]);
  const nudge = (dx: number, dz: number) => selected && update(selected, (p) => moveTo(p, p.position[0] + dx, p.position[2] + dz, size));
  const turn = (dir: 1 | -1) => selected && update(selected, (p) => rotate(p, dir, size));
  const resize = (next: RoomSize) => {
    const s = clampSize(next);
    store.setSize(s);
    store.setPlacements(shrinkRoom(placements, s));
  };

  // 키보드 — 입력칸 밖에서 화살표로 옮기고 Q · E 로 돌린다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const step = e.shiftKey ? BIG_STEP : STEP;
      const map: Record<string, () => void> = {
        ArrowLeft: () => nudge(-step, 0),
        ArrowRight: () => nudge(step, 0),
        ArrowUp: () => nudge(0, -step),
        ArrowDown: () => nudge(0, step),
        q: () => turn(1),
        Q: () => turn(1),
        e: () => turn(-1),
        E: () => turn(-1),
        Escape: () => store.select(null),
      };
      const run = map[e.key];
      if (!run || (!selected && e.key !== "Escape")) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const removeOne = (p: Placement) => {
    const line = cart.lines.find((l) => l.slug === p.slug && (l.color ?? "") === (p.color ?? ""));
    if (!line) return;
    if (line.quantity > 1) cart.set(p.slug, line.quantity - 1, p.color ?? "");
    else cart.remove(p.slug, p.color ?? "");
  };

  return (
    <div className={`grid min-h-svh pt-16 ${noRender ? "" : "lg:grid-cols-[3fr_2fr]"}`}>
      {!noRender && (
        <div data-testid="room-stage" data-scene={sceneReady ? "ready" : "loading"} className="relative h-[50svh] lg:sticky lg:top-0 lg:h-svh [&_canvas]:touch-none">
          {/* 캔버스 위 손가락은 페이지를 스크롤하지 않는다 — 가구를 끌거나 시점을 돌린다 */}
          <Stage3D poster={posterUrl(items[0]?.product.polyhavenId ?? "sofa_02", 1024)} posterAlt="" className="h-full w-full" fallback={null}>
            <PlannerScene size={size} items={planned} selected={selected} overlaps={overlaps} topView={store.topView} onSelect={store.select} onMove={onMove} onReady={onReady} />
          </Stage3D>
          <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted">가구를 눌러 끌기 · 빈 곳을 끌어 둘러보기</p>
        </div>
      )}
      <section className={`px-5 pb-16 pt-6 sm:px-8 ${noRender ? "mx-auto w-full max-w-2xl" : "lg:pt-10"}`}>
        <h1 className="text-2xl font-light">내 방에 놓아 보기</h1>
        {noRender && (
          <p className="mt-4 text-sm text-muted">
            이 기기에서는 3D 를 그릴 수 없어요.{" "}
            <Link href="/cart" className="text-accent underline-offset-4 hover:underline">
              장바구니로
            </Link>
          </p>
        )}

        <fieldset className="mt-6">
          <legend className="text-sm text-muted">방 크기 (m)</legend>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <SizeInput key={`w${size.width}`} id="width" label="가로" value={size.width} min={ROOM_LIMITS.min} max={ROOM_LIMITS.max} onCommit={(v) => resize({ ...size, width: v })} />
            <SizeInput key={`d${size.depth}`} id="depth" label="세로" value={size.depth} min={ROOM_LIMITS.min} max={ROOM_LIMITS.max} onCommit={(v) => resize({ ...size, depth: v })} />
            <SizeInput key={`h${size.height}`} id="height" label="높이" value={size.height} min={ROOM_LIMITS.minH} max={ROOM_LIMITS.maxH} onCommit={(v) => resize({ ...size, height: v })} />
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap gap-2">
          <ToolButton testid="room-rotate-left" label="왼쪽으로 돌리기 (Q)" disabled={!selected} onClick={() => turn(1)}>
            ⟲ 돌리기
          </ToolButton>
          <ToolButton testid="room-rotate-right" label="오른쪽으로 돌리기 (E)" disabled={!selected} onClick={() => turn(-1)}>
            돌리기 ⟳
          </ToolButton>
          <ToolButton testid="room-top-view" label="위에서 보기" pressed={store.topView} onClick={store.toggleTopView}>
            위에서 보기
          </ToolButton>
          <ToolButton testid="room-reset" label="처음 배치로" onClick={store.reset}>
            처음 배치로
          </ToolButton>
        </div>
        <p className="mt-2 text-xs text-muted">고른 가구는 화살표로 10cm, Shift + 화살표로 50cm 씩 옮겨요</p>

        {planned.length === 0 ? (
          <p className="mt-8 text-sm">아직 놓인 가구가 없어요</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {planned.map((it) => {
              const p = getProduct(it.slug)!;
              const on = selected === it.key;
              const bad = overlaps.has(it.key);
              return (
                <li
                  key={it.key}
                  data-testid={`room-item-${it.key}`}
                  data-x={it.position[0]}
                  data-z={it.position[2]}
                  data-rot={deg(it.rotationY)}
                  data-overlap={bad ? "true" : "false"}
                  data-selected={on ? "true" : "false"}
                  className={`flex items-center gap-3 py-2 ${on ? "bg-bg-raised" : ""}`}
                >
                  <button type="button" aria-pressed={on} onClick={() => store.select(on ? null : it.key)} className="flex min-h-11 flex-1 items-center gap-2 text-left text-sm">
                    <span>
                      {p.name}
                      {it.instance > 0 && <span className="text-muted"> #{it.instance + 1}</span>}
                    </span>
                    <ColorBadge slug={it.slug} color={it.color} />
                    {bad && <span className="text-xs text-[#e0604a]">겹쳐요</span>}
                  </button>
                  <button type="button" onClick={() => removeOne(it)} className="inline-flex min-h-11 items-center px-2 text-xs text-muted hover:text-fg">
                    빼기
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {adding ? (
          <AddFurnitureDrawer onAdd={(slug) => cart.add(slug)} onClose={() => setAdding(false)} />
        ) : (
          <button type="button" data-testid="room-add" onClick={() => setAdding(true)} className="mt-6 w-full rounded-full border border-fg/25 py-3 text-sm hover:border-accent">
            가구 더하기
          </button>
        )}
        <Link href="/cart" className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-bg hover:brightness-110">
          장바구니로
        </Link>
      </section>
    </div>
  );
}

function SizeInput({ id, label, value, min, max, onCommit }: { id: string; label: string; value: number; min: number; max: number; onCommit: (v: number) => void }) {
  // 바깥 값이 바뀌면 key 로 다시 만들어져 draft 가 새 값에서 시작한다
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const v = Number(draft);
    if (Number.isFinite(v) && draft.trim() !== "") onCommit(v);
    else setDraft(String(value));
  };
  return (
    <label className="grid gap-1 text-xs text-muted">
      {label}
      <input
        data-testid={`room-size-${id}`}
        type="number"
        inputMode="decimal"
        step={0.1}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="min-h-11 rounded-md border border-line bg-bg-raised px-3 text-sm text-fg tabular-nums"
      />
    </label>
  );
}

function ToolButton({ testid, label, disabled, pressed, onClick, children }: { testid: string; label: string; disabled?: boolean; pressed?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-xs transition-colors disabled:opacity-40 ${pressed ? "border-accent text-accent" : "border-fg/20 hover:border-fg/40"}`}
    >
      {children}
    </button>
  );
}
