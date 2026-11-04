# LUMEN 3차 — 색 바꾸기 · 내 방에 놓아 보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 천 · 가죽 가구 7개의 색을 골라 3D 로 보고 그 색 그대로 주문하고, `/room` 에서 내 방 크기에 장바구니 가구를 끌어 배치한다.

**Architecture:** 색은 카탈로그(`products.ts`)의 `colors` 와 선택적 재채색 셰이더(`src/three/recolor.ts`, 이미 있음)로 그린다. 장바구니 · 주문의 한 줄은 (상품, 색) — DB 기본키에 `color` 를 더한다(마이그레이션 0003). 내 방은 장바구니를 그대로 방으로 쓰고, 배치 계산은 순수 함수(`src/room/planner.ts`), 상태는 브라우저 저장(zustand persist).

**Tech Stack:** Next.js 16 · React 19 · three.js 0.187 (WebGPURenderer · TSL) · R3F 9 · drei · zustand · Prisma 7 · Vitest · Playwright

**Spec:** `docs/superpowers/specs/2026-11-04-lumen-phase3-design.md`

## Global Constraints
- 색 없음 = `""` (DB 기본값, 브라우저 줄의 `color` 생략과 같다). 카탈로그에 없는 색 id 는 서버가 `""` 로 바꾼다
- 가격은 색과 무관 — `priceLines` 는 카탈로그 가격만 쓴다
- 줄 열쇠 문자열은 `` `${slug}|${color}` `` (`lineKey`), 방 배치 열쇠는 `` `${slug}|${color}#${instance}` `` (`placementKey`)
- 방 크기: 가로 · 세로 2.0 ~ 8.0m, 높이 2.2 ~ 3.5m, 0.1m 단위. 기본 = 자동 배치 크기, 높이 2.6m
- 끌기 5cm 맞춤, 키보드 화살표 10cm · `Shift` 50cm, 회전 90° (`Q` 반시계 · `E` 시계)
- 마이그레이션 0003 은 더하기만(기본값 있는 열 · 기본키 교체). 운영 DB 에 먼저, 코드 배포는 그다음
- 화면 문구는 기존 말투(해요체, 짧게). 다크 톤 · accent `#e8b679` 밖으로 나가지 않는다 (CLAUDE.md 디자인 스킬 원칙)
- 커밋 메시지는 제목 + 왜 그렇게 했는지 본문 (포트폴리오용, 메모리 portfolio-docs-voice)

## Review Focus
1. 같은 상품을 색만 다르게 두 번 담은 뒤 하나만 빼거나 수량을 바꾸면 다른 색 줄은 그대로여야 한다 → Task 3 단위 테스트 `setLine/removeLine 은 같은 색 줄만`
2. 로그인 전 브라우저에 담은 (상품, 색) 이 로그인 순간 서버와 합쳐질 때 색이 지켜져야 한다 → Task 3 통합 테스트 `mergeIntoCart 는 색별로 합친다`
3. 결제 완료 후 주문한 (상품, 색) 만 장바구니에서 빠져야 한다 — 같은 상품 다른 색은 남는다 → Task 4 통합 테스트 `subtractOrdered 는 색까지 맞춰 뺀다`
4. 저장된 방 배치가 있는 상태에서 방 크기를 줄이면 벽 밖으로 나간 가구가 안으로 들어와야 한다 → Task 5 단위 `shrinkRoom 은 벽 밖 가구를 안으로`
5. 휴대폰에서 방 캔버스 위 빈 곳을 끌 때 페이지가 스크롤되지 않고 시점이 돌아야 하며, 가구가 없는 곳 탭은 선택을 해제한다 → Task 6 e2e `휴대폰: 빈 곳 탭은 선택 해제`

---

### Task 1: 카탈로그에 색 옵션

**Files:**
- Modify: `src/catalog/types.ts`, `src/catalog/products.ts`, `src/catalog/query.ts`, `src/three/recolor.ts`
- Test: `tests/unit/catalog.test.ts`

**Interfaces:**
- Produces:
  - `type ColorOption = { id: string; label: string; swatch: string; recolor?: Recolor }` (types.ts), `Product.colors?: ColorOption[]`
  - `Recolor` 에 `material?: string` 추가 — 있으면 이름에 이 문자열이 든 재질만 바꾼다
  - `colorsOf(slug: string): ColorOption[]` — 없으면 `[]`
  - `normalizeColor(slug: string, color: string | null | undefined): string` — 카탈로그에 있으면 그 id, 아니면 `""`. 첫(원래) 색 id 도 `""` 로 바꾼다
  - `colorOption(slug: string, color: string): ColorOption | undefined`

- [ ] **Step 1: 실패하는 테스트**
```ts
it("색 옵션은 천 · 가죽 가구 7개", () =>
  expect(products.filter((p) => p.colors).map((p) => p.slug).sort()).toEqual(
    ["classic-armchair", "ember-sofa", "halo-lounge-chair", "moss-chair", "pebble-ottoman", "siesta-daybed", "velvet-sofa"]));
it("첫 색은 원래 색이라 recolor 가 없고, 나머지는 있다 · id 는 상품 안에서 유일", () => { /* 각 상품: colors[0].recolor undefined, 나머지 defined, Set(ids).size === length, swatch 는 /^#[0-9a-f]{6}$/i */ });
it("normalizeColor", () => {
  expect(normalizeColor("velvet-sofa", "navy")).toBe("navy");
  expect(normalizeColor("velvet-sofa", colorsOf("velvet-sofa")[0].id)).toBe("");
  expect(normalizeColor("velvet-sofa", "no-such")).toBe("");
  expect(normalizeColor("orbit-coffee-table", "navy")).toBe("");
  expect(normalizeColor("velvet-sofa", null)).toBe("");
});
```
- [ ] **Step 2:** `npx vitest run tests/unit/catalog.test.ts` → FAIL (`colorsOf` 없음)
- [ ] **Step 3:** 구현. 색 · 대표색 · 허용 범위 시작값은 설계 3 · 4.1장과 `.superpowers/palette.mjs` 결과: Velvet key `#968c82` tol 0.12 · Classic key `#9e9b99` tol 0.2 · Moss key `#41463d` tol 0.04 · Ember key `#110e08` tol 0.05(목표색은 어둡게) · Halo `material: "pillow"`(key 없음) · Pebble key 없음(재질 통째) · Siesta 는 `palette.mjs vintage_day_bed` 로 매트 색을 잡는다. id 는 영문 소문자(`navy`, `terracotta` …), label 은 한국어
- [ ] **Step 4:** 테스트 통과 · `npm run check`
- [ ] **Step 5:** 커밋 `feat: 천 · 가죽 가구 7개에 색 옵션`

### Task 2: 상품 상세 — 색 고르면 3D 가 바뀐다

**Files:**
- Modify: `src/three/ProductModel.tsx`, `src/product/ProductViewer.tsx`, `src/product/ProductPurchase.tsx`, `src/cart/ui/AddToCartButton.tsx`, `src/app/products/[slug]/page.tsx`
- Create: `src/product/ColorPicker.tsx`, `src/product/useColorParam.ts`
- Test: `tests/e2e/color.spec.ts`

**Interfaces:**
- Consumes: Task 1 `colorsOf`, `colorOption`, `normalizeColor`; `recolorMaterial(src, r)` (recolor.ts)
- Produces:
  - `ProductModel` prop `recolor?: Recolor` — 로드된 장면을 복제할 때 해당 메시 재질을 `recolorMaterial` 로 바꾼다. 색만 바뀌면 모델을 다시 받지 않는다(useMemo 의존성)
  - `useColorParam(slug): [color: string, setColor: (id: string) => void]` — `?color=` 를 읽고 `history.replaceState` 로 쓴다(정적 페이지 유지). 값은 `normalizeColor`
  - `AddToCartButton` prop `color?: string` → `cart.add(slug, qty, color)` (Task 3 의 시그니처. Task 3 전에는 무시)
  - 견본 버튼: `data-testid="color-<id>"`, `aria-pressed`, `aria-label="<label>"`. 원래 색 id 버튼도 있다

- [ ] **Step 1: 실패하는 e2e**
```ts
test("색을 고르면 주소와 선택 상태가 바뀐다", async ({ page }) => {
  await page.goto("/products/velvet-sofa");
  await page.getByTestId("color-navy").click();
  await expect(page).toHaveURL(/color=navy/);
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByTestId("color-navy")).toHaveAttribute("aria-pressed", "true");
});
test("색 옵션이 없는 상품은 견본이 없다", async ({ page }) => {
  await page.goto("/products/orbit-coffee-table");
  await expect(page.getByTestId(/^color-/)).toHaveCount(0);
});
```
- [ ] **Step 2:** `npx next build && npx playwright test tests/e2e/color.spec.ts` → FAIL
- [ ] **Step 3:** 구현. 견본은 담기 위에 한 줄, 고른 색 이름을 옆에 글로(`색 · 네이비`)
- [ ] **Step 4:** e2e 통과
- [ ] **Step 5: 색 맞추기(화면).** 7개 상품 × 모든 색을 `?renderer=webgl2&tier=1&color=<id>` 로 찍어(스크립트 `.superpowers/shot-colors.cjs`, `sheet.mjs` 로 한 장) 나무가 물들지 않고 결이 살아 있는지 본다. 어긋나면 Task 1 의 목표색 · tol 을 고친다
- [ ] **Step 6:** 커밋 `feat: 상품 상세에서 색을 고르면 3D 가 그 색으로`

### Task 3: 장바구니 한 줄 = (상품, 색)

**Files:**
- Modify: `prisma/schema.prisma`, `src/cart/lines.ts`, `src/cart/guest-store.ts`, `src/cart/repo.ts`, `src/cart/actions.ts`, `src/cart/useCart.ts`, `src/commerce/pricing.ts`, `src/cart/ui/CartList.tsx`, `src/cart/ui/CartView.tsx`
- Create: `prisma/migrations/0003_line_color/migration.sql`
- Test: `tests/unit/cart-lines.test.ts`, `tests/unit/pricing.test.ts`, `tests/integration/cart-repo.test.ts`, `tests/e2e/color.spec.ts`

**Interfaces:**
- Consumes: Task 1 `normalizeColor`, `colorOption`
- Produces:
  - `CartLine = { slug: string; quantity: number; color?: string }` · `lineKey(l: { slug: string; color?: string }): string`
  - `addLine(lines, slug, qty = 1, color = "")` · `setLine(lines, slug, qty, color = "")` · `removeLine(lines, slug, color = "")` · `mergeLines` 는 `lineKey` 로 합친다
  - `PricedLine` 에 `color: string; colorLabel?: string` 추가. `priceLines` 는 `lineKey` 로 묶는다
  - repo: `writeLine(userId, slug, qty, color = "")`, `addToLine(userId, slug, qty, color = "")`, `readCart` 가 `color` 를 돌려준다(`""` 면 생략). 모든 입력 색은 `normalizeColor` 를 거친다
  - actions: `addToCartAction(slug, qty = 1, color = "")`, `setCartLineAction(slug, qty, color = "")`, `removeCartLineAction(slug, color = "")`
  - `useCart().add(slug, qty?, color?)`, `.set(slug, qty, color?)`, `.remove(slug, color?)`; `focused` · `focus()` 는 `lineKey` 문자열. 끊긴 요청 재전송(`lumen-cart-pending`)의 열쇠도 `lineKey`
  - `CartList` 의 행 `data-testid="cart-line-<slug>"` 는 원래 색일 때 그대로, 색이 있으면 `cart-line-<slug>-<color>` (기존 e2e 유지)
  - 스키마: `CartItem.color String @default("")`, `@@id([userId, productSlug, color])`; `OrderItem.color String @default("")`, `OrderItem.colorLabelSnapshot String?`

- [ ] **Step 1: 실패하는 테스트**
  - 단위 `setLine/removeLine 은 같은 색 줄만`: `[{velvet-sofa,1},{velvet-sofa,1,navy}]` 에서 `removeLine(l,"velvet-sofa","navy")` → 원래 색 줄만 남음, `setLine(l,"velvet-sofa",3)` → 원래 색만 3
  - 단위 `addLine 은 색이 다르면 새 줄`, `mergeLines 는 lineKey 로 더하고 9 에서 자른다`
  - 단위 pricing `색이 달라도 가격은 같고 줄은 둘`: navy 1 + 원래 1 → lines 2, total = 가격 × 2, navy 줄 `colorLabel === "네이비"`
  - 통합 `같은 상품 두 색은 두 줄`, `없는 색 id 는 "" 로 저장`, `mergeIntoCart 는 색별로 합친다`
  - e2e `두 색을 담으면 장바구니에 두 줄 · 색 이름이 보인다`(상세에서 원래 색 담기 → navy 담기 → `/cart` 에 `cart-line-velvet-sofa` 와 `cart-line-velvet-sofa-navy`, 후자에 "네이비")
- [ ] **Step 2:** `npm run test:unit` · `npm run test:db` → FAIL
- [ ] **Step 3:** 스키마 수정 → `npm run db:diff` 로 SQL 을 뽑아 `0003_line_color/migration.sql` 로 저장 → dev DB 에 `npx prisma migrate deploy`(.env.local = dev) → `npx prisma generate`. SQL 이 기존 행을 지우지 않는지(열 추가 + 기본키 교체만) 눈으로 확인
- [ ] **Step 4:** 나머지 구현. 기존 호출부(`AddToCartButton`, 쇼룸 `onAdd`, `CartView`, 재전송)를 새 시그니처로
- [ ] **Step 5:** `npm run check && npm run test:db && npm run test:e2e` 통과
- [ ] **Step 6:** 커밋 `feat: 장바구니 한 줄은 (상품, 색)` — 본문에 마이그레이션은 더하기만이라는 것과 배포 순서

### Task 4: 주문 · 장면까지 색이 따라간다

**Files:**
- Modify: `src/orders/create.ts`, `src/cart/repo.ts` (`subtractOrdered`), `src/orders/confirm.ts`, `src/room/arrange.ts`, `src/room/RoomScene.tsx`, `src/orders/ui/CompleteView.tsx`, `src/checkout/CheckoutView.tsx`, `src/app/orders/[id]/page.tsx`
- Test: `tests/integration/orders.test.ts`, `tests/unit/arrange.test.ts`, `tests/e2e/color.spec.ts`

**Interfaces:**
- Consumes: Task 3 `PricedLine.color/colorLabel`, `lineKey`
- Produces:
  - `OrderItem` 생성 시 `color`, `colorLabelSnapshot`
  - `subtractOrdered(userId, ordered: CartLine[])` 가 `lineKey` 로 맞춘다
  - `arrangeRoom` 입력 `Item = { product; quantity; color?: string }`, `Placement.color?: string`. 같은 상품 다른 색은 다른 인스턴스 묶음(`instance` 는 (상품, 색)마다 0부터)
  - `RoomScene` 은 `colorOption(p.slug, p.color)?.recolor` 를 `ProductModel` 에 넘긴다. `focused` · `onPick` 은 `lineKey`

- [ ] **Step 1: 실패하는 테스트**
  - 통합 `주문 줄에 색과 색 이름이 남는다`, `subtractOrdered 는 색까지 맞춰 뺀다`(navy 1 · 원래 1 담고 navy 만 주문 → 원래 색 줄 남음)
  - 단위 `같은 상품 다른 색은 따로 놓이고 색을 기억한다`
  - e2e `색을 고른 채 결제하면 주문 상세에 색 이름`(데모 로그인 → navy 담기 → 결제(시뮬레이션) → `/orders/<id>` 에 "네이비")
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현 (주문서 · 주문 상세 · 장바구니 목록의 색 표시는 같은 작은 컴포넌트 `src/catalog/ColorBadge.tsx` — 견본 점 + 이름, 원래 색이면 아무것도 안 그림)
- [ ] **Step 4:** 전체 통과 + 장바구니 방 · 완료 장면 스크린샷으로 색 확인
- [ ] **Step 5:** 커밋 `feat: 고른 색이 주문 · 결제 완료 장면까지 따라간다`

### Task 5: 내 방 배치 계산 (순수 함수)

**Files:**
- Create: `src/room/planner.ts`
- Modify: `src/room/arrange.ts`
- Test: `tests/unit/planner.test.ts`

**Interfaces:**
- Consumes: Task 4 `Placement`(color 포함), `arrangeRoom`
- Produces (`src/room/planner.ts`):
  - `type RoomSize = { width: number; depth: number; height: number }`, `const ROOM_LIMITS = { min: 2, max: 8, minH: 2.2, maxH: 3.5, step: 0.1 }`
  - `clampSize(s: RoomSize): RoomSize` — 범위 · 0.1 단위
  - `placementKey(p: { slug: string; color?: string; instance: number }): string`
  - `footprint(p: Placement): { w: number; d: number }` — 90° · 270° 면 가로 · 깊이를 바꾼다
  - `moveTo(p: Placement, x: number, z: number, size: RoomSize): Placement` — 5cm 맞춤 후 벽 안에 가둔다(footprint 의 절반만큼 안쪽)
  - `rotate(p: Placement, dir: 1 | -1, size: RoomSize): Placement` — ±90°, 돌린 뒤 다시 벽 안에
  - `overlapping(ps: Placement[]): Set<string>` — 바닥(`level: floor`) 가구끼리 footprint 가 겹치는 placementKey 들 (경계만 닿으면 겹침 아님)
  - `surfaceY(p: Placement, ps: Placement[]): number` — surface 소품이 탁자 · 선반 footprint 안이면 그 높이(치수 높이), 아니면 0
  - `arrangeInto(items, size: RoomSize): Placement[]` — `arrangeRoom(items, { width, depth })` 고정 크기. 못 놓은 것은 방 가운데(겹침 표시는 `overlapping` 이 한다)
  - `reconcile(saved: Placement[], fresh: Placement[]): Placement[]` — fresh 의 키 기준: 저장된 게 있으면 저장된 위치 · 회전, 없으면 fresh. fresh 에 없는 저장분은 버린다
  - `shrinkRoom(ps: Placement[], size: RoomSize): Placement[]` — 모두 `moveTo(p, p.x, p.z, size)` 로 다시 가둔다
  - 천장 가구(`level: ceiling`)의 높이는 `size.height − 치수 높이` — `arrangeInto` · `shrinkRoom` · 높이 변경 때 다시 계산한다 (`arrange.ts` 의 `CEILING = 2.6` 고정값 대신)
- `arrangeRoom(items, fixed?: { width: number; depth: number })` — fixed 면 크기를 늘리지 않고, `Full` 이면 놓인 것까지 + 나머지는 가운데

- [ ] **Step 1: 실패하는 테스트** — 위 함수마다: `moveTo 는 5cm 로 맞추고 벽 밖으로 못 나간다`(4×4 방에 폭 2m 소파를 x=3 으로 → x=1.0), `rotate 90° 면 footprint 가 바뀌고 벽 안으로 다시`, `overlapping 경계만 닿으면 아님`, `surfaceY 탁자 위면 탁자 높이`, `arrangeInto 3×3 에 다 안 들어가면 남는 건 가운데`, `reconcile 새 가구는 자동 자리 · 사라진 가구는 버림 · 남은 건 저장 위치`, `shrinkRoom 은 벽 밖 가구를 안으로`, `clampSize 범위 · 0.1 단위`
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** `npm run check` 통과
- [ ] **Step 5:** 커밋 `feat: 내 방 배치 계산 — 벽 안에 가두기 · 겹침 · 상판 위`

### Task 6: `/room` 화면

**Files:**
- Create: `src/app/room/page.tsx`, `src/room/RoomPlanner.tsx`, `src/room/PlannerScene.tsx`, `src/room/useRoomStore.ts`, `src/room/AddFurnitureDrawer.tsx`
- Test: `tests/e2e/room.spec.ts`

**Interfaces:**
- Consumes: Task 5 전부, `useCart()`, `loadStage3D`, `ProductModel`(recolor)
- Produces:
  - `useRoomStore` (zustand persist, 키 `lumen-room`, version 1): `{ size: RoomSize | null; placements: Placement[]; selected: string | null; topView: boolean }` + `setSize`, `setPlacements`, `select`, `toggleTopView`, `reset`. localStorage 실패 시 메모리로 동작(guest-store 와 같은 패턴)
  - 화면 testid: `room-size-width` · `room-size-depth` · `room-size-height`(number input, 라벨 있음), `room-item-<placementKey>`(목록 행, `data-x` · `data-z` · `data-rot` · `data-overlap`), `room-rotate-left` · `room-rotate-right`, `room-top-view`, `room-reset`, `room-add`(서랍 열기), 서랍 안 상품 버튼 `room-add-<slug>`
  - 캔버스 위 조작: 가구 포인터다운 → 선택 + 끌기(바닥 평면 레이캐스트 → `moveTo`), 빈 곳 포인터다운(가구 아님) → 선택 해제 · 시점 회전. 끄는 동안 OrbitControls 끔
  - 키보드(페이지에 포커스, 입력칸 밖): 화살표 · `Shift`+화살표 · `Q` · `E` · `Escape`(선택 해제)
- 레이아웃: 장바구니 화면과 같은 좌(방) · 우(크기 입력 · 목록 · 버튼), 휴대폰은 위 · 아래

- [ ] **Step 1: 실패하는 e2e** (`room.spec.ts`)
  - `빈 장바구니면 빈 방과 가구 더하기`
  - `가구 더하기로 담으면 장바구니 수가 늘고 목록에 생긴다`
  - `키보드로 옮기면 위치가 바뀌고 벽에서 멈춘다`(소파 선택 → ArrowRight × 40 → `data-x` 가 방 절반 − footprint 절반에서 멈춤)
  - `Q 로 돌리면 data-rot 이 90 씩`
  - `방 크기를 줄이면 가구가 벽 안으로`(width 2.5 입력 → 모든 행 `data-x` 가 범위 안)
  - `새로고침해도 배치가 남는다`
  - `처음 배치로 되돌리기`
  - `휴대폰: 빈 곳 탭은 선택 해제` (viewport 390×844, hasTouch — 목록에서 선택 후 캔버스 구석 탭 → 선택 표시 사라짐, `window.scrollY` 그대로)
  - `3D 를 못 그리면 안내`(`?renderer=none` → "이 기기에서는 3D 를 그릴 수 없어요" + 장바구니 링크)
- [ ] **Step 2:** FAIL → **Step 3:** 구현 (먼저 store · 목록 · 키보드로 e2e 를 통과시키고, 캔버스 끌기는 그 위에)
- [ ] **Step 4:** e2e 통과 + 손으로 확인: 데스크톱 마우스 끌기 · 위에서 보기, 휴대폰 에뮬레이션 터치 끌기(스크린샷)
- [ ] **Step 5: 디자인 점검** — `.claude/skills/impeccable/reference/craft-floor.md` 의 Verify 항목(대비 · 상태 · 키보드 포커스 · 휴대폰 구성)을 `/room` 에 적용, `.superpowers/audit.mjs` 에 `/room` 추가해 터치 영역 · 대비 확인
- [ ] **Step 6:** 커밋 `feat: 내 방에 놓아 보기 — 크기 입력 · 끌기 · 돌리기 · 위에서 보기`

### Task 7: 들어오는 길 · 문서 · 배포

**Files:**
- Modify: `src/showroom/Showroom.tsx`(비활성 버튼 → `/room` 링크), `src/cart/ui/CartView.tsx`(`내 방 크기로 놓아 보기`), `src/product/ProductPurchase.tsx`(`내 방에 놓아 보기` — 담고 `/room`), `README.md`, `docs/perf/`(필요 시)
- Test: `tests/e2e/room.spec.ts`, `tests/e2e/showroom.spec.ts`

- [ ] **Step 1: 실패하는 e2e** — `쇼룸 둘러보기에서 내 방으로`, `장바구니에서 내 방으로`, `상세에서 내 방에 놓아 보기를 누르면 담기고 방에 있다`
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** 전체 `npm run check && npm run test:db && npm run test:e2e`
- [ ] **Step 5:** README 에 3차 이야기(사람 문체 · 메모리 portfolio-docs-voice): 텍스처 한 장에서 천만 칠하기(시험 → 결정), 색이 주문까지, 내 방 배치. 스크린샷 `docs/screenshots/` (색 비교 · 내 방)
- [ ] **Step 6:** 커밋 `feat: 쇼룸 · 장바구니 · 상세에서 내 방으로` · `docs: README 3차`
- [ ] **Step 7: 배포** — 사용자에게 운영 DB 마이그레이션 0003 을 `!` 로 부탁(`npx prisma migrate deploy` + 운영 연결 문자열, 2차 절차) → 적용 확인 후 main 병합 · push → 운영에서 색 고르기 · 결제 · `/room` 손으로 확인 → 포트폴리오 카드 PR
