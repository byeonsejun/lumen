# LUMEN 2차 — 담기 · 내 방 장바구니 · 데모 계정 · 토스 테스트 결제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3D 에서 바로 담고, 담은 가구가 자동 배치된 "내 방" 장바구니를 보고, 토스 테스트 결제 뒤 불이 켜지는 완료 장면까지 이어지는 구매 흐름을 붙인다.

**Architecture:** 1차 Next.js 앱에 Neon Postgres(Prisma 7 + Neon 어댑터)와 Auth.js v5(JWT)를 더한다. 상품은 계속 TS 카탈로그이고 가격은 서버가 카탈로그로 다시 계산한다. 로그인 전 장바구니는 localStorage, 로그인 순간 서버로 합친다. 결제는 토스 결제창 → success 리다이렉트에서 서버 승인. 로그인이 필요한 경로와 남의 주문 404 는 `src/proxy.ts` 에서 응답 전에 판단한다.

**Tech Stack:** 1차 스택 + prisma / @prisma/client / @prisma/adapter-neon 7.10 · @neondatabase/serverless 1.2 · next-auth 5.0.0-beta.32 · @tosspayments/tosspayments-sdk 2.10

**Spec:** `docs/superpowers/specs/2026-11-02-lumen-phase2-design.md` (1차 전역 제약은 `2026-11-02-lumen-design.md` · 1차 계획 Global Constraints)

## Global Constraints

- 1차 Global Constraints 전부 유지 (WebGPURenderer 하나 · GLSL/ShaderMaterial/pmndrs postprocessing/drei Line 금지 · Poly Haven 출처 · 데스크톱 60 / 저사양 30fps)
- **쇼룸 · Shop · 상품 상세는 정적으로 남는다** — `next build` 출력에서 `/` · `/products/[slug]` 가 `○`/`◐` 그대로. 세션은 클라이언트(`useSession`) 또는 `<Suspense>` 안에서만 읽는다
- 가격 · 합계는 **서버에서 `src/catalog` 로 다시 계산**한다. 클라이언트가 보낸 가격 · 금액은 저장하지 않는다
- 수량은 1~9 정수. 범위 밖은 잘라 넣는다(clamp)
- **주문서(`/checkout`) 화면에 3D 없음**
- 토스 **테스트 키만**. `PAYMENT_SIMULATION=true` 면 결제창을 건너뛰고 승인도 가짜 응답(로컬 · e2e). 운영 Vercel 환경엔 이 변수를 넣지 않는다
- 결제 완료 표시 문구: `테스트 결제입니다. 실제 배송되지 않아요`
- 주문 내역엔 `PAID` 주문만
- 데모 계정: 브라우저마다 임시 계정, 만든 지 24시간 지난 데모 계정은 새 데모 계정을 만들 때 장바구니 · 주문째 삭제
- Prisma 는 InterestGroup 과 같은 방식: `prisma.config.ts` · generator `prisma-client` → `src/generated/prisma` · `PrismaNeon` 어댑터 · `db()` 지연 생성. **`prisma migrate dev` 는 비대화형에서 막힌다** — `prisma migrate diff --from-migrations ... --to-schema ... --script` 로 SQL 을 만들고 `prisma migrate deploy`
- DB 는 Neon `main`(운영) · `dev`(로컬 · e2e · Preview) 두 브랜치. 테스트는 **절대 main 에 쓰지 않는다**
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 사람에게 보이는 문서(README 등)는 면접관이 읽는 글로, 사람이 쓴 문체로 (메모리 portfolio-docs-voice)

### 스펙에서 조정한 것 (계획 단계 판단)
- **스펙 5.2 의 Auth.js 표준 테이블(Account · Session · VerificationToken) 대신 우리 `User` 하나 + JWT** — InterestGroup 과 같은 방식. @auth/prisma-adapter 의 Prisma 7(커스텀 output) 호환을 피하고, Credentials(데모)와 JWT 는 어댑터 없이 더 단순하다. 로그인 제공자 · 세션 동작은 스펙과 같다
- **결제 성공 시 장바구니 "전부 비움" 대신 "주문한 수량만큼 뺀다"** — 결제창이 열린 동안 다른 탭에서 담은 가구까지 지우지 않기 위해 (Review Focus 3)

## Review Focus

1. **로그인 순간 합치기에서 같은 상품 합이 9 를 넘는다** → 9 로 잘린다. 카탈로그에 없는 slug 는 버린다 — Task 3
2. **결제창에서 뒤로 가기 · 창 닫기 · 실패** → 주문은 PENDING/FAILED 로 남고 장바구니는 그대로, 다시 `주문하기` 가능 — Task 9
3. **결제창이 열린 동안 다른 탭에서 장바구니를 바꿈** → 결제는 주문 생성 당시 스냅샷 금액으로, 성공 뒤엔 주문한 수량만 장바구니에서 빠진다 — Task 9
4. **카탈로그에서 사라진 상품이 든 옛 주문** → 주문 상세는 `OrderItem` 스냅샷(이름 · 가격)으로 보이고, 완료 장면은 모델 없는 항목을 건너뛴다 — Task 10 · 11
5. **JWT 는 살아 있는데 데모 계정이 정리돼 사라짐** → 장바구니 · 주문 동작이 500 이 아니라 "로그아웃 상태" 로 처리 — Task 5

---

## File Structure

```
prisma.config.ts · prisma/schema.prisma · prisma/migrations/
src/generated/prisma/                 (생성물, gitignore)
src/server/db.ts                      db()
src/auth.ts                           NextAuth 설정 · 데모 프로바이더
src/app/api/auth/[...nextauth]/route.ts
src/server/users.ts                   upsertOAuthUser · createDemoUser · purgeExpiredDemoUsers · findUser
src/commerce/pricing.ts               priceLines · orderNameOf · amountMatches   (순수)
src/cart/lines.ts                     CartLine · addLine · setLine · removeLine · mergeLines   (순수)
src/cart/guest-store.ts               로그인 전 장바구니 (zustand persist)
src/cart/repo.ts                      서버 장바구니 DB 접근 (userId 인자)
src/cart/actions.ts                   'use server' — 세션 → repo
src/cart/useCart.ts                   화면이 쓰는 단일 훅 (게스트/로그인 분기 · 합치기 트리거)
src/cart/ui/{CartBadge,AddToCartButton,CartToast}.tsx
src/room/arrange.ts                   arrangeRoom (순수)
src/room/RoomScene.tsx                배치 결과를 그리는 3D 장면 (장바구니 · 완료 공용)
src/app/login/page.tsx · src/app/cart/page.tsx · src/app/checkout/{page,success/route,fail/page}.tsx
src/app/orders/{page,[id]/page,[id]/complete/page}.tsx
src/orders/{create,confirm,queries}.ts  주문 생성 · 승인 · 조회
src/payments/toss.ts                  승인 API 클라이언트 (Nextour 이식, 확인만)
src/payments/PayButton.tsx            결제창 호출 (시뮬레이션 분기)
src/proxy.ts                          (수정) 로그인 필요 경로 · 남의 주문 404
tests/unit/{pricing,cart-lines,arrange}.test.ts
tests/integration/{users,cart-repo,orders}.test.ts   (dev DB · npm run test:db)
tests/e2e/{auth,cart,checkout,orders}.spec.ts
```

---

### Task 1: DB 기반 — Prisma 7 + Neon (사용자 계정 작업 포함)

**Files:** Create `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/0001_init/migration.sql`, `src/server/db.ts`, `vitest.integration.config.mts`, `tests/integration/db.test.ts`; Modify `package.json`, `.gitignore`

**Interfaces:**
- Produces: `db(): PrismaClient` · 모델
  ```prisma
  enum AuthProvider { KAKAO GOOGLE DEMO }
  enum OrderStatus { PENDING PAID FAILED }
  model User { id String @id @default(uuid(7)) @db.Uuid; provider AuthProvider; providerUserId String; name String?; createdAt DateTime @default(now()) @db.Timestamptz
               cartItems CartItem[]; orders Order[]; @@unique([provider, providerUserId]) }
  model CartItem { userId String @db.Uuid; productSlug String; quantity Int; updatedAt DateTime @updatedAt @db.Timestamptz
                   user User @relation(fields:[userId], references:[id], onDelete: Cascade); @@id([userId, productSlug]) }
  model Order { id String @id  // 토스 orderId 겸용: "LM" + 20자 무작위(영숫자) — 6~64자 규칙 충족
                userId String @db.Uuid; status OrderStatus @default(PENDING); totalKRW Int; orderName String
                recipientName String; recipientPhone String; recipientAddress String
                paymentKey String?; method String?; paidAt DateTime? @db.Timestamptz; createdAt DateTime @default(now()) @db.Timestamptz
                user User @relation(..., onDelete: Cascade); items OrderItem[]; @@index([userId, status, createdAt]) }
  model OrderItem { id String @id @default(uuid(7)) @db.Uuid; orderId String; productSlug String; nameSnapshot String; priceSnapshotKRW Int; quantity Int
                    order Order @relation(..., onDelete: Cascade) }
  ```
- 통합 테스트 규칙: 테스트마다 자기 사용자를 만들고 `afterEach` 에서 그 사용자만 지운다(cascade). 다른 데이터에 의존하지 않는다
- scripts: `postinstall: prisma generate` · `db:diff` (migrate diff → stdout) · `db:deploy: prisma migrate deploy` · `test:db: vitest run -c vitest.integration.config.mts`

- [ ] **Step 1: 사용자 계정 작업 — 여기서 멈추고 안내한다** (스펙 8장 1)
  1. Vercel 대시보드 → `lumen` → Storage → Neon 연결 (`DATABASE_URL` · `DATABASE_URL_UNPOOLED` 자동 등록)
  2. Neon 콘솔에서 `dev` 브랜치를 만들고 그 연결 문자열을 Vercel 의 Development · Preview 환경 `DATABASE_URL`(풀러) · `DATABASE_URL_UNPOOLED`(직접)로 넣는다
  3. `vercel env pull .env.local` (Development 값 = dev 브랜치)
  - 확인: `.env.local` 의 호스트가 Production 값과 다르다(dev 브랜치)
- [ ] **Step 2: 실패 테스트** `tests/integration/db.test.ts`
  ```ts
  it('dev DB 에 연결되고 마이그레이션이 적용돼 있다', async () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
    await expect(db().user.count()).resolves.toBeTypeOf('number');
  });
  ```
  `npm run test:db` → FAIL (모듈 없음)
- [ ] **Step 3:** 의존성 설치(`prisma@7.10 @prisma/client@7.10 @prisma/adapter-neon@7.10 @neondatabase/serverless@1.2 dotenv`), `prisma.config.ts`(InterestGroup 과 같은 형태 — `.env.local` 로드, 마이그레이션은 UNPOOLED), 스키마, `db.ts`, 마이그레이션 SQL 생성(`db:diff`) → `npm run db:deploy`
- [ ] **Step 4:** `npm run test:db` PASS · `npm run check` PASS · `npm run build` PASS(빌드에 DATABASE_URL 없어도 됨 — `db()` 지연 생성)
- [ ] **Step 5:** 커밋 `feat: Neon Postgres · Prisma 7 기반`

### Task 2: 가격 계산 (순수)

**Files:** Create `src/commerce/pricing.ts`, `tests/unit/pricing.test.ts`

**Interfaces:**
- Consumes: `getProduct` (1차)
- Produces:
  ```ts
  type PricedLine = { slug: string; name: string; unitPriceKRW: number; quantity: number; subtotalKRW: number };
  priceLines(lines: { slug: string; quantity: number }[]): { lines: PricedLine[]; totalKRW: number }
  //  모르는 slug 제거 · 수량 1~9 로 clamp(정수 아니면 내림) · 같은 slug 는 합쳐서 clamp
  orderNameOf(lines: PricedLine[]): string        // 1개: 'Ember 3인 소파' · 여러 개: 'Ember 3인 소파 외 2건'
  amountMatches(expectedKRW: number, received: string | number | null): boolean   // 정수 문자열 정확 일치만
  ```
- [ ] **Step 1: 실패 테스트**
  ```ts
  it('카탈로그 가격으로 합계', () => expect(priceLines([{ slug: 'ember-sofa', quantity: 2 }]).totalKRW).toBe(3_780_000));
  it('모르는 slug 는 버린다', () => expect(priceLines([{ slug: 'nope', quantity: 1 }]).lines).toEqual([]));
  it('수량 clamp · 중복 합침', () => expect(priceLines([{ slug: 'ember-sofa', quantity: 7 }, { slug: 'ember-sofa', quantity: 5 }]).lines[0].quantity).toBe(9));
  it('0 · 음수 · 소수는 1 이상 정수로', () => { expect(priceLines([{ slug: 'ember-sofa', quantity: 0 }]).lines[0].quantity).toBe(1); expect(priceLines([{ slug: 'ember-sofa', quantity: 2.7 }]).lines[0].quantity).toBe(2); });
  it('주문명', () => expect(orderNameOf(priceLines([{ slug: 'ember-sofa', quantity: 1 }, { slug: 'orbit-coffee-table', quantity: 1 }, { slug: 'fern-planter', quantity: 3 }]).lines)).toBe('Ember 3인 소파 외 2건'));
  it('금액 검증은 정확 일치만', () => { expect(amountMatches(540000, '540000')).toBe(true); expect(amountMatches(540000, '540000.0')).toBe(false); expect(amountMatches(540000, '1')).toBe(false); expect(amountMatches(540000, null)).toBe(false); });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 서버 가격 계산과 금액 검증`

### Task 3: 장바구니 줄 연산 (순수) · 로그인 전 장바구니

**Files:** Create `src/cart/lines.ts`, `src/cart/guest-store.ts`, `tests/unit/cart-lines.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type CartLine = { slug: string; quantity: number };
  addLine(lines, slug, qty = 1): CartLine[]      // 있으면 더하고 9 에서 자름, 없으면 뒤에 추가
  setLine(lines, slug, qty): CartLine[]          // 1~9 clamp
  removeLine(lines, slug): CartLine[]
  mergeLines(server: CartLine[], local: CartLine[]): CartLine[]   // 같은 slug 합 · 9 상한 · 모르는 slug 제거 · server 순서 유지 후 새 것 뒤에
  cartCount(lines): number
  useGuestCart: zustand persist store { lines, add, set, remove, clear }  // localStorage key 'lumen-cart'
  ```
- [ ] **Step 1: 실패 테스트** — `addLine` 누적·상한, `setLine` clamp, `mergeLines`:
  ```ts
  it('합치면 같은 상품은 더하고 9 에서 자른다', () => expect(mergeLines([{ slug: 'ember-sofa', quantity: 6 }], [{ slug: 'ember-sofa', quantity: 5 }, { slug: 'halo-lounge-chair', quantity: 1 }])).toEqual([{ slug: 'ember-sofa', quantity: 9 }, { slug: 'halo-lounge-chair', quantity: 1 }]));
  it('모르는 slug 는 합칠 때 버린다', () => expect(mergeLines([], [{ slug: 'ghost', quantity: 1 }])).toEqual([]));
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 장바구니 줄 연산과 로그인 전 장바구니`

### Task 4: 로그인 — 카카오 · 구글 · 데모 계정

**Files:** Create `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/users.ts`, `src/app/login/page.tsx`, `tests/integration/users.test.ts`, `tests/e2e/auth.spec.ts`; Modify `src/app/layout.tsx`(SessionProvider · 헤더 로그인 상태)

**Interfaces:**
- Consumes: `db()`
- Produces:
  ```ts
  // src/server/users.ts
  upsertOAuthUser(provider: 'KAKAO' | 'GOOGLE', providerUserId: string, name?: string): Promise<{ id: string }>
  createDemoUser(now = new Date()): Promise<{ id: string; name: string }>   // name '데모 손님', providerUserId 무작위
  purgeExpiredDemoUsers(now = new Date()): Promise<number>                  // createdAt < now-24h 인 DEMO 삭제(cascade)
  findUser(id: string): Promise<{ id: string; provider: AuthProvider; name: string | null } | null>
  // src/auth.ts
  export const { handlers, auth, signIn, signOut }
  //  session: jwt · pages.signIn '/login'
  //  providers: Credentials({ id: 'demo' }) 항상 · Kakao(AUTH_KAKAO_ID 있을 때) · Google(AUTH_GOOGLE_ID 있을 때)
  //  demo authorize: purgeExpiredDemoUsers() 후 createDemoUser()
  //  jwt 콜백: 최초 로그인 때 userId(우리 User.id)와 provider 를 토큰에 고정 (OAuth 는 upsertOAuthUser)
  //  session.user = { id, name, isDemo: boolean }
  ```
- `/login`: 맨 위 `데모 계정으로 체험하기`(설명 한 줄: `개인 계정 없이 결제 완료까지 둘러볼 수 있어요`) → 카카오 → 구글. `callbackUrl` 쿼리 존중(같은 사이트 경로만)
- 헤더: 비로그인 `로그인` · 로그인 `{name}`(데모면 `데모 계정` 배지) · `내 주문` · `로그아웃`. 클라이언트 `useSession` 으로 — 정적 페이지 유지

- [ ] **Step 1: 실패 통합 테스트** (dev DB)
  ```ts
  it('데모 계정은 만들 때마다 다른 사용자', async () => { const a = await createDemoUser(); const b = await createDemoUser(); expect(a.id).not.toBe(b.id); });
  it('24시간 지난 데모 계정만 정리 (장바구니째)', async () => { const old = await createDemoUser(new Date(Date.now() - 25 * 3600e3)); await db().cartItem.create({ data: { userId: old.id, productSlug: 'ember-sofa', quantity: 1 } }); const fresh = await createDemoUser(); await purgeExpiredDemoUsers(); expect(await findUser(old.id)).toBeNull(); expect(await findUser(fresh.id)).not.toBeNull(); expect(await db().cartItem.count({ where: { userId: old.id } })).toBe(0); });
  it('OAuth 사용자는 같은 계정이면 한 명', async () => { const a = await upsertOAuthUser('KAKAO', 'k-1'); const b = await upsertOAuthUser('KAKAO', 'k-1'); expect(a.id).toBe(b.id); });
  it('정리는 데모만 지운다', async () => { const u = await upsertOAuthUser('GOOGLE', 'g-old'); await db().user.update({ where: { id: u.id }, data: { createdAt: new Date(0) } }); await purgeExpiredDemoUsers(); expect(await findUser(u.id)).not.toBeNull(); });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5: 실패 e2e** `tests/e2e/auth.spec.ts` + 헬퍼 `loginAsDemo(page)` (`/login` → 데모 버튼 → 헤더에 `데모 계정`)
  ```ts
  test('데모 계정으로 로그인하면 헤더에 데모 계정', async ({ page }) => { await loginAsDemo(page); await expect(page.getByText('데모 계정')).toBeVisible(); });
  test('정적 페이지는 그대로 정적', async () => { /* .next 의 prerender-manifest 에 '/' 와 '/products/ember-sofa' 가 있다 */ });
  ```
- [ ] **Step 6:** e2e PASS (`playwright.config` webServer 에 dev DB `.env.local` · `AUTH_SECRET` · `PAYMENT_SIMULATION=true`) · `npm run build` 출력에서 `/` · `/products/[slug]` 기호 확인
- [ ] **Step 7:** 커밋 `feat: 카카오 · 구글 · 데모 계정 로그인`

### Task 5: 서버 장바구니 · 화면 장바구니 훅 · 로그인 순간 합치기

**Files:** Create `src/cart/repo.ts`, `src/cart/actions.ts`, `src/cart/useCart.ts`, `tests/integration/cart-repo.test.ts`

**Interfaces:**
- Consumes: Task 3 `mergeLines` · `addLine`, Task 4 `auth` · `findUser`
- Produces:
  ```ts
  // repo.ts (userId 인자 — 테스트 가능)
  readCart(userId): Promise<CartLine[]>        // updatedAt 오름차순
  writeLine(userId, slug, qty): Promise<void>  // qty 0 이면 삭제, 1~9 clamp, 모르는 slug 무시
  mergeIntoCart(userId, local: CartLine[]): Promise<CartLine[]>
  subtractOrdered(userId, ordered: CartLine[]): Promise<void>   // 주문 수량만큼 빼고 0 이하면 삭제 (Task 9)
  // actions.ts — 모두 세션 확인. 세션 없음 · 사용자 없음(정리된 데모) → { ok: false, reason: 'signed-out' }
  getCartAction(): Promise<{ ok: true; lines: CartLine[] } | { ok: false; reason: 'signed-out' }>
  addToCartAction(slug, qty) · setCartLineAction(slug, qty) · removeCartLineAction(slug) · mergeGuestCartAction(lines)
  // useCart.ts
  useCart(): { lines: CartLine[]; count: number; status: 'guest' | 'synced' | 'syncing';
               add(slug, qty?): void; set(slug, qty): void; remove(slug): void; focused: string | null; focus(slug | null): void }
  //  로그인 상태가 되는 순간 게스트 줄이 있으면 mergeGuestCartAction → 성공 시 게스트 비움
  //  로그인 후 조작은 낙관적 반영 → 액션 결과로 교체. 'signed-out' 이면 signOut() 뒤 게스트 모드
  ```
- [ ] **Step 1: 실패 통합 테스트** — `writeLine` clamp/0 삭제/모르는 slug 무시, `mergeIntoCart` 9 상한, `subtractOrdered` 부분 차감:
  ```ts
  it('주문한 수량만 뺀다', async () => { await writeLine(u, 'ember-sofa', 3); await writeLine(u, 'halo-lounge-chair', 1); await subtractOrdered(u, [{ slug: 'ember-sofa', quantity: 2 }, { slug: 'halo-lounge-chair', quantity: 1 }]); expect(await readCart(u)).toEqual([{ slug: 'ember-sofa', quantity: 1 }]); });
  it('사라진 사용자에 대한 액션은 signed-out', async () => { /* auth() 를 없는 userId 세션으로 모킹 → getCartAction() 이 { ok:false, reason:'signed-out' } */ });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 서버 장바구니와 로그인 순간 합치기`

### Task 6: 3D 에서 바로 담기 · 헤더 배지 · 토스트

**Files:** Create `src/cart/ui/{CartBadge,AddToCartButton,CartToast}.tsx`, `tests/e2e/cart.spec.ts`; Modify `src/showroom/Showroom.tsx`(오버레이 `담기`), `src/showroom/ShowroomScene.tsx`(explore 이름표 옆 `+`), `src/app/products/[slug]/page.tsx`(비활성 버튼 → 수량 1~9 + `AddToCartButton`), `src/app/layout.tsx`(배지 · 토스트)

**Interfaces:**
- Consumes: Task 5 `useCart`
- Produces: `<AddToCartButton slug qty? variant: 'primary' | 'overlay' | 'hotspot' />` (`data-testid="add-to-cart"`), `<CartBadge />` (`data-testid="cart-count"`, 0 이면 숨김), 토스트 `담았어요 · 장바구니 보기`(3초, `role="status"`)
- 1차 비활성 `내 방에 놓아 보기 (준비 중)` 는 그대로 둔다

- [ ] **Step 1: 실패 e2e**
  ```ts
  test('상세에서 수량 2 로 담으면 배지 2', async ({ page }) => { await page.goto('/products/ember-sofa'); await page.getByLabel('수량').selectOption('2'); await page.getByTestId('add-to-cart').click(); await expect(page.getByTestId('cart-count')).toHaveText('2'); await expect(page.getByRole('status')).toContainText('담았어요'); });
  test('쇼룸 오버레이에서 담고 새로고침해도 남는다', async ({ page }) => { /* 첫 가구 구간으로 스크롤 → 오버레이 담기 → reload → 배지 1 */ });
  test('로그인 전에 담은 가구가 데모 로그인 뒤에도 남는다', async ({ page }) => { /* 상세 담기 2 → loginAsDemo → 배지 2 → /cart 목록에 Ember */ });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS · 1차 e2e 18건도 PASS
- [ ] **Step 5:** 커밋 `feat: 쇼룸 · 상세에서 바로 담기`

### Task 7: 내 방 자동 배치 (순수)

**Files:** Create `src/room/arrange.ts`, `tests/unit/arrange.test.ts`

**Interfaces:**
- Consumes: `Product` (category · dimensionsMm)
- Produces:
  ```ts
  type Placement = { slug: string; instance: number; position: [x: number, y: number, z: number]; rotationY: number; label?: string /* '×N' */ };
  type RoomLayout = { width: number; depth: number; placements: Placement[] };   // 미터, 방 가운데 원점, 뒷벽 z = -depth/2
  arrangeRoom(items: { product: Product; quantity: number }[]): RoomLayout
  ```
- 알고리즘 (스펙 4.3 규칙 순서 그대로):
  1. 인스턴스 펼치기: 상품마다 min(quantity, 4) 개. 4 개 초과면 4 번째에 `label: '×{quantity}'`
  2. 역할: seating 중 가로 ≥ 1.2m(소파) · bed · shelves → **벽**, table → **가운데**, 나머지 seating(의자 · 오토만) → **둘레**, lighting 중 높이 ≥ 0.6m 이고 상품명이 펜던트 · 샹들리에(= `dusk-pendant` · `crown-chandelier`) → **천장**, 그 외 lighting · 화병 → **위에 놓기**, 화분(`fern-planter`) → **구석**
  3. 방 4×4 에서 시작. 아래 배치가 실패하면 width · depth 를 0.5 씩 늘려 처음부터 다시
  4. 벽: 뒷벽 왼→오, 차면 왼쪽 벽, 오른쪽 벽. 등을 벽에서 0.05m. 회전은 벽을 등지게(뒷벽 0, 왼벽 π/2, 오른벽 −π/2)
  5. 가운데: 테이블을 (0, 0, 0) 부터 x 로 나란히(간격 0.4m)
  6. 둘레: 첫 테이블(없으면 첫 벽 가구) 앞쪽 반원 위 등간격, 테이블을 바라보게
  7. 천장: 테이블 위(없으면 방 가운데), y = 2.6 − 높이
  8. 위에 놓기: 테이블 → 선반 상판 높이(y = 그 가구 높이) 위 빈 자리, 없으면 구석 바닥
  9. 구석: 앞쪽부터 네 구석
  - 겹침 판정은 바닥 사각형(가로 × 깊이, 회전 반영) + 0.1m 여유. 천장 · 위에 놓기는 바닥 겹침 판정에서 뺀다
- [ ] **Step 1: 실패 테스트**
  ```ts
  const P = (slug: string, quantity = 1) => ({ product: getProduct(slug)!, quantity });
  it('같은 입력은 같은 배치', () => expect(arrangeRoom([P('ember-sofa'), P('orbit-coffee-table')])).toEqual(arrangeRoom([P('ember-sofa'), P('orbit-coffee-table')])));
  it('소파는 뒷벽에 붙는다', () => { const r = arrangeRoom([P('ember-sofa')]); const s = r.placements[0]; expect(s.rotationY).toBe(0); expect(s.position[2]).toBeCloseTo(-r.depth / 2 + 0.05 + 0.818 / 2, 2)  // 깊이 818mm (dimensionsMm 은 [가로, 높이, 깊이]); });
  it('테이블은 가운데', () => expect(arrangeRoom([P('orbit-coffee-table')]).placements[0].position).toEqual([0, 0, 0]));
  it('바닥 가구끼리 겹치지 않는다', () => { const r = arrangeRoom(getProducts().filter((p) => p.category !== 'decor').map((p) => P(p.slug))); expect(floorOverlaps(r)).toEqual([]); });
  it('자리가 모자라면 방이 넓어진다', () => expect(arrangeRoom(['ember-sofa','velvet-sofa','siesta-daybed','cathedral-bed','grid-shelf','loft-steel-shelf'].map((s) => P(s))).width).toBeGreaterThan(4));
  it('4 개 넘게 담으면 4 개만 놓고 ×N', () => { const r = arrangeRoom([P('moss-chair', 6)]); expect(r.placements).toHaveLength(4); expect(r.placements[3].label).toBe('×6'); });
  it('펜던트는 테이블 위 천장', () => { const r = arrangeRoom([P('orbit-coffee-table'), P('dusk-pendant')]); const l = r.placements.find((p) => p.slug === 'dusk-pendant')!; expect(l.position[0]).toBe(0); expect(l.position[1]).toBeGreaterThan(1.5); });
  it('화병은 테이블 위', () => { const r = arrangeRoom([P('orbit-coffee-table'), P('pearl-vase')]); expect(r.placements.find((p) => p.slug === 'pearl-vase')!.position[1]).toBeCloseTo(0.491, 2); });
  it('빈 장바구니는 빈 4×4 방', () => expect(arrangeRoom([])).toEqual({ width: 4, depth: 4, placements: [] }));
  ```
  (`floorOverlaps` 는 테스트 파일 안의 헬퍼)
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 내 방 자동 배치`

### Task 8: 장바구니 화면 `/cart` — 좌우 나누기 · 방 ↔ 목록 연결

**Files:** Create `src/room/RoomScene.tsx`, `src/app/cart/page.tsx`, `src/cart/ui/CartList.tsx`; Modify `tests/e2e/cart.spec.ts`

**Interfaces:**
- Consumes: Task 5 `useCart`(lines · focused · focus), Task 7 `arrangeRoom`, 1차 `Stage3D` · `ProductModel` · `PostFX`
- Produces: `<RoomScene layout: RoomLayout; focused: string | null; onPick(slug): void; lights: 'on' | 'sequence' | 'off' />` — 벽 3면 + 바닥, 가구마다 `ProductModel`, `focused` 면 그 가구에만 스포트라이트 · 나머지 조명 30%, `label` 은 drei `Html`. 터치 기기는 1차처럼 자동 왕복. (Task 10 이 `lights='sequence'` 로 재사용)
- 레이아웃: `lg` 이상 좌 60% 방(`sticky`) · 우 목록, 그 아래는 방(45svh) 위 · 목록 아래. 목록 행 `data-testid="cart-line-{slug}"` · hover/focus/click → `focus(slug)`, 방에서 가구 클릭 → 해당 행 `data-focused="true"` + 스크롤
- 빈 상태: 방 대신 빈 방 + 스포트라이트, 문구 `아직 담은 가구가 없어요` + `쇼룸` · `Shop` 링크
- 렌더 불가(이미지 폴백)면 방 칸을 숨기고 목록을 넓게
- `주문하기`: 로그인 상태면 `/checkout`, 아니면 `/login?callbackUrl=/checkout`

- [ ] **Step 1: 실패 e2e**
  ```ts
  test('담은 가구가 목록과 방에 나온다', async ({ page }) => { /* 상세 2곳에서 담기 → /cart → cart-line 2개 · stage-canvas 보임 · 합계 = 두 가격 합 */ });
  test('수량을 바꾸면 합계가 바뀐다', async ({ page }) => { /* + 클릭 → 합계 갱신 */ });
  test('목록 행을 누르면 방에서 그 가구가 강조된다', async ({ page }) => { /* 행 클릭 → 행 data-focused=true (방 쪽은 RoomScene 의 data-focused 속성을 캔버스 래퍼에 반영해 확인) */ });
  test('빈 장바구니', async ({ page }) => { await page.goto('/cart'); await expect(page.getByText('아직 담은 가구가 없어요')).toBeVisible(); });
  test('비로그인 주문하기는 로그인으로', async ({ page }) => { /* 담기 → /cart → 주문하기 → URL /login?callbackUrl=%2Fcheckout */ });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS. 스크린샷으로 방 배치 눈 확인(소파 · 테이블 · 의자 · 펜던트 · 화병 조합) — 이상하면 Task 7 규칙 수정은 테스트 먼저
- [ ] **Step 5:** 커밋 `feat: 내 방 장바구니 화면`

### Task 9: 주문서 · 주문 생성 · 토스 결제 · 승인

**Files:** Create `src/orders/create.ts`, `src/orders/confirm.ts`, `src/payments/toss.ts`, `src/payments/PayButton.tsx`, `src/app/checkout/page.tsx`, `src/app/checkout/success/route.ts`, `src/app/checkout/fail/page.tsx`, `tests/integration/orders.test.ts`, `tests/e2e/checkout.spec.ts`; Modify `src/proxy.ts`

**Interfaces:**
- Consumes: Task 2 `priceLines` · `orderNameOf` · `amountMatches`, Task 5 `readCart` · `subtractOrdered`
- Produces:
  ```ts
  createOrder(userId, recipient: { name: string; phone: string; address: string }): Promise<{ orderId: string; amount: number; orderName: string } | { error: 'empty-cart' | 'invalid-recipient' }>
  //  서버 장바구니 → priceLines → Order(PENDING) + OrderItem 스냅샷. 받는 사람 세 칸 모두 1~100자
  type TossConfirm = (args: { paymentKey: string; orderId: string; amount: number }) => Promise<{ method: string; approvedAt: string }>
  confirmOrder(userId, params: { paymentKey: string | null; orderId: string | null; amount: string | null }, toss: TossConfirm):
    Promise<{ result: 'paid' | 'already-paid'; orderId: string } | { result: 'rejected'; reason: 'not-found' | 'amount-mismatch' | 'pg-failed' }>
  //  내 주문 아님 → not-found · amount 불일치 → FAILED, toss 미호출 · 이미 PAID → already-paid, toss 미호출
  //  성공 → PAID · paymentKey · method · paidAt · subtractOrdered(주문 수량)
  tossConfirm: TossConfirm      // 실제 API (Idempotency-Key = orderId, 8초 타임아웃) — Nextour toss/client.ts 에서 confirm 만 이식
  simulatedConfirm: TossConfirm // { method: '카드(시뮬레이션)', approvedAt: now }
  ```
- `/checkout`(로그인 필요 — proxy): 주문 요약 · 받는 사람 폼 · 문구 `테스트 결제입니다. 실제 배송되지 않아요` · `<PayButton>`. **3D 없음**
- `PayButton`: 클릭 시 서버 액션 `createOrder` → `PAYMENT_SIMULATION`(서버가 내려준 플래그)이면 `/checkout/success?paymentKey=sim_...&orderId&amount` 로 이동, 아니면 `loadTossPayments(NEXT_PUBLIC_TOSS_CLIENT_KEY).payment({ customerKey: userId }).requestPayment({ method: 'CARD', amount: { currency: 'KRW', value }, orderId, orderName, successUrl, failUrl })`
- `/checkout/success` (Route Handler GET): `confirmOrder(..., env.PAYMENT_SIMULATION ? simulatedConfirm : tossConfirm)` → paid/already-paid → 302 `/orders/{id}/complete`, rejected → 302 `/checkout/fail?reason=...`
- `/checkout/fail`: 토스 `message` 또는 reason 문구 + `장바구니로 돌아가기`
- proxy: `/checkout` · `/orders/:path*` 비로그인 → `/login?callbackUrl=...`

- [ ] **Step 1: 실패 통합 테스트** (가짜 toss 로 호출 횟수 기록)
  ```ts
  it('금액이 다르면 승인하지 않고 FAILED', async () => { const { orderId } = await setupOrder(u, [['ember-sofa', 1]]); const toss = vi.fn(); expect(await confirmOrder(u, { paymentKey: 'k', orderId, amount: '1' }, toss)).toEqual({ result: 'rejected', reason: 'amount-mismatch' }); expect(toss).not.toHaveBeenCalled(); expect((await db().order.findUnique({ where: { id: orderId } }))!.status).toBe('FAILED'); });
  it('두 번 와도 승인은 한 번', async () => { /* 첫 호출 paid, 두 번째 already-paid, toss 1회 */ });
  it('남의 주문은 not-found', async () => { /* 다른 user 의 orderId */ });
  it('승인 뒤 주문한 수량만 장바구니에서 빠진다', async () => { /* 장바구니 ember 3 → 주문 생성(3) → 장바구니에 halo 추가(다른 탭) → 승인 → 장바구니 = [halo 1] */ });
  it('빈 장바구니는 주문을 만들지 않는다', async () => expect(await createOrder(emptyUser, okRecipient)).toEqual({ error: 'empty-cart' }));
  it('토스 승인 실패면 pg-failed · 장바구니 그대로', async () => { /* toss reject → rejected pg-failed, cart 불변, status FAILED */ });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5: 실패 e2e** `tests/e2e/checkout.spec.ts` (시뮬레이션)
  ```ts
  test('데모로 담기 → 주문 → 결제 → 완료 화면', async ({ page }) => { /* loginAsDemo → 담기 2개 → /cart 주문하기 → 폼 → 결제하기 → URL /orders/{id}/complete · '주문이 완료됐어요' · 배지 숨김 */ });
  test('결제 실패 화면에서 장바구니는 그대로', async ({ page }) => { /* /checkout/fail?message=취소 → 장바구니로 → 줄 그대로 */ });
  test('주문서에는 3D 가 없다', async ({ page }) => { /* /checkout 에 stage-canvas 0 */ });
  ```
- [ ] **Step 6:** PASS → 커밋 `feat: 주문서 · 토스 테스트 결제 · 서버 승인`

### Task 10: 결제 완료 장면

**Files:** Create `src/app/orders/[id]/complete/page.tsx`, `src/orders/queries.ts`; Modify `tests/e2e/checkout.spec.ts`

**Interfaces:**
- Consumes: Task 7 `arrangeRoom`, Task 8 `RoomScene`(lights='sequence')
- Produces: `getMyOrder(userId, orderId): Promise<OrderWithItems | null>` (PAID 아니어도 반환 — 화면이 상태 분기) · `listMyPaidOrders(userId)`
- 장면: 이번 주문 항목만 배치(카탈로그에 없는 slug 는 건너뜀) → 0.4초 간격으로 가구마다 스포트라이트 → 마지막에 방 조명. `prefers-reduced-motion` 이면 처음부터 `on`
- 아래: `주문이 완료됐어요` · `주문 번호 {id}` · 합계 · `테스트 결제입니다. 실제 배송되지 않아요` · `주문 내역 보기`
- PAID 가 아니면 완료 장면 대신 `/checkout/fail` 로 302
- [ ] **Step 1: 실패 e2e** — 완료 화면에 주문 번호 · `stage-canvas`; **새로고침해도 주문 승인 시각(`data-paid-at`)이 그대로**; reduced-motion 컨텍스트에서 첫 프레임부터 `data-lights="on"`
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 결제 완료 — 산 가구 위로 불이 켜진다`

### Task 11: 주문 내역 · 남의 주문 404

**Files:** Create `src/app/orders/page.tsx`, `src/app/orders/[id]/page.tsx`, `tests/e2e/orders.spec.ts`; Modify `src/proxy.ts`

**Interfaces:**
- Consumes: Task 10 `getMyOrder` · `listMyPaidOrders`
- 목록: PAID 만, 최신순 — 주문일 · `orderName` · 합계 · 상세 링크. 비었으면 `아직 주문한 가구가 없어요`
- 상세: OrderItem 스냅샷(이름 · 단가 · 수량) · 받는 사람 · 결제 수단 · 승인 시각 — 3D 없음
- **남의 주문 / 없는 주문 → 404**: proxy 에서 `auth()` 로 사용자 확인 후 `/orders/{id}` · `/orders/{id}/complete` 의 주인을 DB 로 확인, 아니면 `/_not-found` 로 rewrite(status 404) — 1차 상품 404 와 같은 이유(Cache Components 스트리밍 뒤 notFound 는 200)
- [ ] **Step 1: 실패 e2e**
  ```ts
  test('주문 내역엔 결제 완료만', async ({ page }) => { /* 결제 1건 성공 + 1건 실패(금액 조작 URL 직접 방문) → /orders 에 1건 */ });
  test('남의 주문은 404', async ({ browser }) => { /* 컨텍스트 A 데모 결제 → orderId · 컨텍스트 B 데모 로그인 → /orders/{id} status 404, /orders/{id}/complete status 404 */ });
  test('카탈로그에 없는 상품이 든 옛 주문도 상세가 열린다', async ({ page }) => { /* 통합 헬퍼로 OrderItem.productSlug='retired-chair' 주문을 dev DB 에 심고 → 상세에 nameSnapshot 표시 */ });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 주문 내역과 주문 상세`

### Task 12: 운영 환경 · 배포 · 문서

**Files:** Modify `README.md`, `docs/perf/phase1.md` → 새 `docs/perf/phase2.md`, `.env.example`

- [ ] **Step 1: 사용자 계정 작업 — 여기서 멈추고 안내한다** (스펙 8장 2~4)
  - 카카오 · 구글 Redirect URI 추가: `https://lumen-showroom.vercel.app/api/auth/callback/kakao` · `.../google` · `http://localhost:3000/...`
  - Vercel Production env: `AUTH_SECRET` · `AUTH_KAKAO_ID/SECRET` · `AUTH_GOOGLE_ID/SECRET` · `NEXT_PUBLIC_TOSS_CLIENT_KEY` · `TOSS_SECRET_KEY`(테스트 키). **`PAYMENT_SIMULATION` 은 넣지 않는다**
- [ ] **Step 2:** `DATABASE_URL_UNPOOLED=<main> npx prisma migrate deploy` — 사용자 확인 후(운영 DB 쓰기)
- [ ] **Step 3:** `npm run check && npm run test:db && npm run build && npm run test:e2e` 전부 PASS. 빌드 출력에서 `/` · `/products/[slug]` 정적 기호 유지 확인
- [ ] **Step 4:** main push → Vercel 자동 배포 → 운영에서 데모 계정으로 담기 · 장바구니 방 · **실제 토스 테스트 결제창** · 완료 장면 · 주문 내역을 손으로 확인. 카카오 · 구글 로그인 1회씩(사용자)
- [ ] **Step 5:** Lighthouse 모바일로 `/` · `/products/ember-sofa` 를 1차 수치와 비교(나빠지면 원인과 함께 보고) · `/cart` 측정 → `docs/perf/phase2.md`
- [ ] **Step 6:** README 갱신 — 2차 이야기(3D 에서 담기 → 내 방 → 불이 켜지는 결제 완료, 자동 배치 규칙, 데모 계정을 넣은 이유, 금액 검증 · 중복 승인 방지)를 1차 README 와 같은 사람 문체로. 스크린샷(장바구니 방 · 완료 장면) 추가
- [ ] **Step 7:** 커밋 `docs: 2차 측정 · README`
- 포트폴리오 카드 갱신은 이 저장소 밖의 별도 작업이다
