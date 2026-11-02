# NOCTURNE 1차 — 쇼룸 · 상품 목록/상세 · 품질 자동 조절 · 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다크 시네마틱 3D 쇼룸 첫 화면, 상품 목록·상세(3D 회전), 기기·GPU 품질 자동 조절을 갖춘 가구 쇼핑몰 1차를 Vercel 에 배포한다.

**Architecture:** Next.js 16 App Router 단일 앱. 3D 는 R3F 위에서 Three.js `WebGPURenderer` 하나로 그린다 — 이 렌더러가 WebGPU 가 안 되면 스스로 WebGL2 백엔드로 내려간다. 둘 다 안 되면 3D 대신 정적 이미지. 상품 정보는 1차에선 TS 모듈(가짜 데이터)이고, 3D 에셋은 빌드 전 스크립트가 Poly Haven 에서 받아 압축해 `public/models` 에 둔다.

**Tech Stack:** Next.js 16.4 · React 19.3 · TypeScript strict · Tailwind 4 · three 0.187 (`three/webgpu`, `three/tsl`) · @react-three/fiber 9.8 · @react-three/drei 10.7 · detect-gpu 5 · zustand · @gltf-transform 4.5 + meshoptimizer + sharp · Vitest 5 · Playwright 1.64

**Spec:** `docs/superpowers/specs/2026-11-02-nocturne-design.md`

## Global Constraints

- 1차 범위 = 스펙 6장 1차 행: 쇼룸(3.2 전부) · 상품 목록 · 상품 상세 3D 회전/확대·치수 · 품질 자동 조절(5장) · 에셋 파이프라인 · 배포. **로그인·장바구니·결제·소재 변경·내 방 배치는 만들지 않는다**
- 사이트 전체 다크 톤. 쇼핑 정보(이름·가격·카테고리)는 3D 위에서도 **읽기 쉬워야 한다** (대비 WCAG AA)
- **Poly Haven 출처 표기**: 모든 페이지 푸터 + 상품 상세에 `3D assets: Poly Haven (polyhaven.com)` 링크
- 성능 목표: 데스크톱 **60fps**, 저사양 노트북·중급 폰 **30fps 이상**
- 모바일은 1차부터 대상. 쇼룸 스크롤은 터치에서도 같은 흐름
- 런타임에 Poly Haven 원본(`dl.polyhaven.org`)을 직접 받지 않는다 — `public/models` 의 압축본만 쓴다 (썸네일 이미지 `cdn.polyhaven.com` 은 예외)
- 렌더러는 `WebGPURenderer` 하나. 그래서 **GLSL `ShaderMaterial` · pmndrs `postprocessing` · drei 의 셰이더 기반 효과(`MeshReflectorMaterial`, `ContactShadows` 등)는 쓰지 않는다** — 노드 머티리얼과 `three/tsl` 만. 후처리는 `RenderPipeline`(three 0.187 이름. `PostProcessing` 은 옛 이름)
- 가격은 원화 정수, 표시 `1,290,000원`
- Next.js 16 은 학습 데이터와 다르다 — 라우트 `params` 는 `Promise`. 코드 쓰기 전 `node_modules/next/dist/docs/` 해당 가이드를 읽는다
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **WebGPU 는 있다고 하는데 어댑터가 `null`** (블록리스트 GPU, 헤드리스 크롬) → WebGL2 로 내려가야 한다. 화면이 까맣게 남으면 안 된다 — Task 4
2. **모델 파일 404·느린 네트워크** → 해당 자리에 포스터 이미지, 페이지 나머지는 정상 — Task 6
3. **탭을 숨겼다 돌아옴** → rAF 가 멈춘 구간의 fps 를 저사양으로 오판해 품질을 내리면 안 된다 — Task 3
4. **`prefers-reduced-motion`** → 자동 회전·조명 애니메이션을 멈추고 스크롤 전환은 즉시 컷 — Task 7
5. **없는 slug · 없는 카테고리 쿼리** → 상세는 404, 목록은 전체를 보여준다 — Task 9

---

## File Structure

```
src/
  app/
    layout.tsx                 다크 테마 · 푸터(출처)
    page.tsx                   쇼룸 (서버) → <Showroom/>
    products/page.tsx          목록 (?category=)
    products/[slug]/page.tsx   상세
    products/[slug]/not-found.tsx
  catalog/
    types.ts                   Product · Category
    products.ts                가짜 상품 데이터
    query.ts                   getProducts · getProduct · getFeatured · formatPrice
  three/
    capability.ts              detectRenderCapability
    createRenderer.ts          WebGPURenderer 생성 (R3F gl 콜백)
    quality/presets.ts         QualityTier · QUALITY_PRESETS
    quality/policy.ts          initialTier · nextTier (순수 함수)
    quality/store.ts           zustand 스토어
    quality/AdaptiveQuality.tsx  fps 샘플링 → nextTier
    Stage3D.tsx                Canvas + 폴백 + 디버그 HUD
    ProductModel.tsx           모델 로드 · 실패 시 포스터
    models.ts                  modelUrl · posterUrl
  showroom/
    timeline.ts                showroomTimeline (순수 함수)
    layout.ts                  ROOM_LAYOUT
    Showroom.tsx               스크롤 섹션 + sticky 캔버스 + 오버레이
    ShowroomScene.tsx          스포트라이트 · 방 공개 · 둘러보기
  product/
    ProductViewer.tsx          상세 3D 뷰어 · 치수 라벨
    ProductCard.tsx
scripts/assets/
  build-assets.ts              Poly Haven → public/models
  plan.ts                      assetJobs (순수 함수)
public/models/{polyhavenId}/{1k|2k}.glb · manifest.json
tests/unit/*.test.ts  ·  tests/e2e/*.spec.ts
docs/perf/phase1.md
```

---

### Task 1: 프로젝트 뼈대 · 다크 레이아웃 · 출처 푸터 · 검사 명령

**Files:**
- Create: Next.js 16 앱 (`create-next-app` — TS, App Router, Tailwind, ESLint, `src/`), `src/app/layout.tsx`, `src/app/globals.css`, `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json` scripts, `.gitignore` (기존 유지)

**Interfaces:**
- Produces: `npm run check` = `lint && typecheck && test:unit`, `npm run test:e2e`. CSS 토큰 `--bg #0b0a09` · `--fg #efe9df` · `--accent #e8b679` · `--muted` (대비 AA 이상으로 고른다)

- [ ] **Step 1:** 기존 저장소에 `npx create-next-app@16.4 . --ts --app --tailwind --eslint --src-dir --import-alias "@/*"` (기존 docs·CLAUDE.md 보존). Vitest·Playwright 설치
- [ ] **Step 2: 실패 테스트** `tests/e2e/smoke.spec.ts`
  ```ts
  test('홈이 다크 배경과 Poly Haven 출처를 보여준다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer a[href*="polyhaven.com"]')).toBeVisible();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 10, 9)');
  });
  ```
- [ ] **Step 3:** `npm run test:e2e` → FAIL
- [ ] **Step 4:** `layout.tsx` — `lang="ko"`, 토큰, 헤더(로고 `NOCTURNE` · `Shop` 링크 `/products`), 푸터 출처 문구 `3D assets: Poly Haven (polyhaven.com)`
- [ ] **Step 5:** `npm run test:e2e` PASS · `npm run check` PASS
- [ ] **Step 6:** 커밋 `chore: Next.js 16 뼈대 · 다크 레이아웃 · 출처 푸터`

### Task 2: 카탈로그 (가짜 상품 데이터)

**Files:** Create `src/catalog/{types,products,query}.ts`, `tests/unit/catalog.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Category = 'seating' | 'table' | 'shelves' | 'bed' | 'lighting' | 'decor';
  const CATEGORY_LABEL: Record<Category, string>; // 의자·소파 / 테이블 / 선반 / 침대 / 조명 / 소품
  type Product = { slug: string; name: string; category: Category; priceKRW: number;
    description: string; material: string; polyhavenId: string;
    dimensionsMm: [w: number, h: number, d: number]; featuredOrder?: number };
  getProducts(category?: string): Product[]   // 모르는 category → 전체
  getProduct(slug: string): Product | undefined
  getFeatured(): Product[]                    // featuredOrder 오름차순, 4~5개
  formatPrice(krw: number): string            // 1290000 → '1,290,000원'
  ```
- 상품 15~20개. `polyhavenId` 는 실제 Poly Haven 모델 ID (예: `sofa_02`, `modern_arm_chair_01`, `Sofa_01`). `dimensionsMm` 은 `api.polyhaven.com/info/{id}` 의 `dimensions` 값을 그대로. 각 카테고리 최소 1개, featured 4~5개는 쇼룸에서 한 방에 어울리는 것(소파·암체어·테이블·조명·식물)

- [ ] **Step 1: 실패 테스트**
  ```ts
  it('모르는 카테고리는 전체를 준다', () => expect(getProducts('nope')).toEqual(getProducts()));
  it('카테고리로 거른다', () => expect(getProducts('table').every(p => p.category === 'table')).toBe(true));
  it('featured 는 4~5개, 순서대로', () => { const f = getFeatured(); expect(f.length).toBeGreaterThanOrEqual(4); expect(f.length).toBeLessThanOrEqual(5); expect(f.map(p => p.featuredOrder)).toEqual([...f.map(p => p.featuredOrder)].sort((a, b) => a! - b!)); });
  it('slug 는 유일', () => expect(new Set(getProducts().map(p => p.slug)).size).toBe(getProducts().length));
  it('모든 카테고리에 상품이 있다', () => Object.keys(CATEGORY_LABEL).forEach(c => expect(getProducts(c).length).toBeGreaterThan(0)));
  it('가격 표기', () => expect(formatPrice(1290000)).toBe('1,290,000원'));
  ```
- [ ] **Step 2:** `npx vitest run tests/unit/catalog.test.ts` → FAIL
- [ ] **Step 3:** 구현 + 데이터 작성 (ID·치수는 API 에서 확인해 적는다)
- [ ] **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 카탈로그 가짜 데이터와 조회 함수`

### Task 3: 품질 정책 (순수 함수 + 스토어)

**Files:** Create `src/three/quality/{presets,policy,store}.ts`, `tests/unit/quality.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type QualityTier = 0 | 1 | 2;   // low · mid · high
  type QualityPreset = { dpr: [min: number, max: number]; shadows: boolean; shadowMapSize: 512 | 1024 | 2048;
    bloom: boolean; ao: boolean; assetRes: '1k' | '2k' };
  const QUALITY_PRESETS: Record<QualityTier, QualityPreset>;
  //  0: dpr [1,1]   shadows false            bloom false ao false '1k'
  //  1: dpr [1,1.5] shadows true  1024       bloom true  ao false '1k'
  //  2: dpr [1,2]   shadows true  2048       bloom true  ao true  '2k'
  initialTier(gpu: { tier: 0|1|2|3; isMobile: boolean }): QualityTier
  //  gpu.tier 0·1 → 0 / 2 → 1 / 3 → 2,  isMobile 이면 최대 1
  type FpsWindow = { avgFps: number; durationMs: number };
  nextTier(current: QualityTier, recent: FpsWindow[], ceiling: QualityTier): QualityTier
  //  durationMs > 1500 인 창은 무시 (탭 숨김·정지 구간)
  //  마지막 창 avgFps < 30 → current-1
  //  마지막 2 창 모두 avgFps >= 58 → min(current+1, ceiling)
  //  그 외 current
  useQuality: zustand { tier, ceiling, backend: 'webgpu'|'webgl2'|'none'|null, fps: number,
    setTier, setCeiling, setBackend, pushFps }
  ```
- 쿼리 `?tier=0|1|2` 는 시작 tier 와 ceiling 을 그 값으로 고정, `?adaptive=off` 는 nextTier 를 끈다 (측정용, Task 11)

- [ ] **Step 1: 실패 테스트**
  ```ts
  it('GPU 등급 3 데스크톱은 high', () => expect(initialTier({ tier: 3, isMobile: false })).toBe(2));
  it('모바일은 최대 mid', () => expect(initialTier({ tier: 3, isMobile: true })).toBe(1));
  it('등급 0·1 은 low', () => { expect(initialTier({ tier: 0, isMobile: false })).toBe(0); expect(initialTier({ tier: 1, isMobile: false })).toBe(0); });
  it('30fps 미만이면 내린다', () => expect(nextTier(2, [{ avgFps: 24, durationMs: 1000 }], 2)).toBe(1));
  it('0 아래로 안 내린다', () => expect(nextTier(0, [{ avgFps: 10, durationMs: 1000 }], 2)).toBe(0));
  it('두 창 연속 58 이상이면 올린다', () => expect(nextTier(0, [{ avgFps: 60, durationMs: 1000 }, { avgFps: 59, durationMs: 1000 }], 2)).toBe(1));
  it('ceiling 위로 안 올린다', () => expect(nextTier(1, [{ avgFps: 60, durationMs: 1000 }, { avgFps: 60, durationMs: 1000 }], 1)).toBe(1));
  it('탭 숨김 같은 긴 창은 무시한다', () => expect(nextTier(2, [{ avgFps: 2, durationMs: 9000 }], 2)).toBe(2));
  ```
- [ ] **Step 2:** FAIL 확인 → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 품질 단계 정책과 스토어`

### Task 4: 렌더러 감지 · 생성 · Stage3D (폴백 · 디버그 HUD · 실행 중 조절)

**Files:** Create `src/three/{capability,createRenderer}.ts`, `src/three/Stage3D.tsx`, `src/three/quality/AdaptiveQuality.tsx`, `tests/unit/capability.test.ts`, `tests/e2e/stage.spec.ts`

**Interfaces:**
- Consumes: Task 3 `useQuality`, `initialTier`, `nextTier`, `QUALITY_PRESETS`
- Produces:
  ```ts
  detectRenderCapability(env?: { gpu?: { requestAdapter(): Promise<unknown | null> };
    createCanvas?: () => HTMLCanvasElement }): Promise<'webgpu' | 'webgl2' | 'none'>
  //  gpu 있고 adapter non-null → webgpu / 아니면 canvas.getContext('webgl2') 성공 → webgl2 / 아니면 none
  //  ?renderer=webgl2|none 쿼리로 강제 가능 (Stage3D 가 읽어 넘긴다)
  createRenderer(cap: 'webgpu' | 'webgl2'): (props: DefaultGLProps) => Promise<WebGPURenderer>
  //  new WebGPURenderer({ ...props, antialias: true, forceWebGL: cap === 'webgl2' }); await r.init();
  //  toneMapping ACESFilmic, shadowMap.enabled = true
  <Stage3D poster: string; posterAlt: string; className?: string; children: ReactNode />
  //  capability 'none' → <img src=poster alt=posterAlt data-testid="stage-fallback">
  //  그 외 → <Canvas data-testid="stage-canvas" gl={createRenderer(cap)} dpr={preset.dpr} shadows> + <AdaptiveQuality/>
  //  ?debug → 우상단 HUD: backend · tier · fps (data-testid="stage-hud")
  <AdaptiveQuality />   // useFrame 으로 1초 창 평균 fps → pushFps → nextTier → setTier
  ```
- 첫 진입 시 `detect-gpu` 의 `getGPUTier()` 로 `initialTier` (실패하면 tier 1)

- [ ] **Step 1: 실패 단위 테스트**
  ```ts
  it('어댑터가 null 이면 webgl2', async () => expect(await detectRenderCapability({ gpu: { requestAdapter: async () => null }, createCanvas: () => fakeCanvas({ webgl2: true }) })).toBe('webgl2'));
  it('어댑터가 있으면 webgpu', async () => expect(await detectRenderCapability({ gpu: { requestAdapter: async () => ({}) }, createCanvas: () => fakeCanvas({ webgl2: true }) })).toBe('webgpu'));
  it('gpu 없고 webgl2 도 없으면 none', async () => expect(await detectRenderCapability({ createCanvas: () => fakeCanvas({ webgl2: false }) })).toBe('none'));
  it('requestAdapter 가 throw 해도 webgl2', async () => expect(await detectRenderCapability({ gpu: { requestAdapter: async () => { throw new Error() } }, createCanvas: () => fakeCanvas({ webgl2: true }) })).toBe('webgl2'));
  ```
- [ ] **Step 2:** FAIL → **Step 3:** `capability.ts`·`createRenderer.ts` 구현 → **Step 4:** PASS
- [ ] **Step 5: 실패 e2e** (임시 테스트 페이지 없이 홈에 Stage3D 를 잠시 둔다 — Task 7 에서 쇼룸으로 바뀐다)
  ```ts
  test('기본은 캔버스, HUD 에 백엔드가 나온다', async ({ page }) => {
    await page.goto('/?debug');
    await expect(page.getByTestId('stage-canvas')).toBeVisible();
    await expect(page.getByTestId('stage-hud')).toContainText(/webgpu|webgl2/);
  });
  test('렌더링 불가면 포스터 이미지', async ({ page }) => {
    await page.goto('/?renderer=none');
    await expect(page.getByTestId('stage-fallback')).toBeVisible();
  });
  test('?tier=0 이면 HUD 에 tier 0', async ({ page }) => {
    await page.goto('/?debug&tier=0');
    await expect(page.getByTestId('stage-hud')).toContainText('tier 0');
  });
  ```
- [ ] **Step 6:** `Stage3D`·`AdaptiveQuality` 구현 (`'use client'`, `next/dynamic` ssr:false 로 감싼다) → e2e PASS
- [ ] **Step 7:** 커밋 `feat: WebGPU 우선 렌더러 · WebGL2/이미지 폴백 · 실행 중 품질 조절`

### Task 5: 에셋 파이프라인

**Files:** Create `scripts/assets/{plan,build-assets}.ts`, `tests/unit/asset-plan.test.ts`, `public/models/**`(생성물, 커밋한다), `src/three/models.ts`

**Interfaces:**
- Consumes: Task 2 `getProducts()`
- Produces:
  ```ts
  // plan.ts
  type AssetJob = { id: string; res: '1k' | '2k'; out: string };   // out = public/models/{id}/{res}.glb
  assetJobs(ids: string[]): AssetJob[]      // 중복 id 제거, id 당 1k·2k
  // build-assets.ts  (npm run assets)
  //  1. GET https://api.polyhaven.com/files/{id} → gltf[res].gltf.url + include 를 받아 임시 폴더에
  //  2. gltf-transform: dedup · prune · weld · resize(1k:1024, 2k:2048) · textureCompress webp(sharp) · meshopt
  //  3. public/models/{id}/{res}.glb, 이미 있으면 건너뛴다 (--force 로 다시)
  //  4. public/models/manifest.json: { [id]: { '1k': bytes, '2k': bytes } }
  //  5. HDRI 하나(어두운 실내, 예: 'brown_photostudio_02' — 실제 존재 확인) 1k .hdr → public/hdri/studio_1k.hdr
  //  요청 헤더 User-Agent: 'NOCTURNE-asset-build/1.0' (Poly Haven 요청)
  // models.ts
  modelUrl(id: string, res: '1k' | '2k'): string   // '/models/{id}/{res}.glb'
  posterUrl(id: string, width = 640): string       // 'https://cdn.polyhaven.com/asset_img/thumbs/{id}.png?width={width}'
  ```
- `next.config` 의 `images.remotePatterns` 에 `cdn.polyhaven.com`

- [ ] **Step 1: 실패 테스트**
  ```ts
  it('id 당 1k·2k 두 작업, 중복 제거', () => expect(assetJobs(['a', 'a', 'b']).map(j => j.out)).toEqual(['public/models/a/1k.glb', 'public/models/a/2k.glb', 'public/models/b/1k.glb', 'public/models/b/2k.glb']));
  it('modelUrl', () => expect(modelUrl('sofa_02', '1k')).toBe('/models/sofa_02/1k.glb'));
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** `npm run assets` 실행 → 모든 상품 id 에 `1k.glb`·`2k.glb` 존재, `manifest.json` 에 크기 기록. **1k 파일 하나가 2MB 를 넘으면** resize 값을 낮추고 다시 (첫 화면 지연 = 실패 조건)
- 생성물은 git 에 커밋한다. 전체가 **100MB 를 넘으면** 커밋하지 말고 멈춰 보고한다 (저장 위치를 Vercel Blob 등으로 바꿀지 결정 필요)
- [ ] **Step 6:** 커밋 `feat: Poly Haven 에셋 압축 파이프라인과 생성물`

### Task 6: ProductModel (단계별 해상도 · 실패 시 포스터)

**Files:** Create `src/three/ProductModel.tsx`, `tests/e2e/model.spec.ts`

**Interfaces:**
- Consumes: Task 3 `useQuality`, Task 5 `modelUrl`·`posterUrl`
- Produces:
  ```tsx
  <ProductModel id: string; onClick?: () => void; castShadow?: boolean />
  // 항상 1k 를 먼저 그리고, preset.assetRes === '2k' 면 2k 를 받아 교체.
  // useGLTF 에 MeshoptDecoder 를 건다. 로드 실패 → ErrorBoundary 가 같은 자리에 포스터 텍스처 평면(billboard) 을 그린다
  // glTF 는 미터 단위 — 스케일하지 않는다
  ```
- 홈의 임시 Stage3D(Task 4) 안에 `<ProductModel id={getFeatured()[0].polyhavenId} />` 를 둔다 — Task 7 에서 쇼룸으로 바뀐다
- [ ] **Step 1: 실패 e2e** — ① 정상: `/?debug` 에서 `/models/{id}/1k.glb` 요청이 200 으로 끝난다. ② `page.route('**/models/**', r => r.abort())` 후 `/` 진입 → 처리 안 된 페이지 에러(`page.on('pageerror')`) 0, `stage-canvas` 보임, `data-testid=model-fallback` 마커 존재
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 단계별 해상도 모델 로더와 실패 폴백`

### Task 7: 쇼룸 — 타임라인 · 도입 · 스포트라이트 스크롤

**Files:** Create `src/showroom/{timeline,layout}.ts`, `src/showroom/{Showroom,ShowroomScene}.tsx`, `tests/unit/timeline.test.ts`, `tests/e2e/showroom.spec.ts`; Modify `src/app/page.tsx`

**Interfaces:**
- Consumes: Task 2 `getFeatured`·`formatPrice`, Task 4 `Stage3D`, Task 6 `ProductModel`
- Produces:
  ```ts
  type ShowroomState =
    | { phase: 'intro'; t: number }
    | { phase: 'spotlight'; index: number; t: number }   // t: 이 가구 구간 안 0..1
    | { phase: 'reveal'; t: number }
    | { phase: 'explore' };
  showroomTimeline(progress: number, count: number): ShowroomState
  //  구간 비율: intro 1 · spotlight 가구당 1 · reveal 1.5 · explore 0.5  (총 count+3)
  //  progress 는 0..1 로 clamp
  ```
- 스크롤: **네이티브 스크롤.** 높이 `(count+3)*100svh` 섹션 안에 `position: sticky` 캔버스. progress = 섹션 rect 기준. (drei `ScrollControls` 는 쓰지 않는다 — 페이지 스크롤·접근성과 충돌)
- 장면: 어두운 바닥 · 위에서 떨어지는 `SpotLight` 원뿔(볼류메트릭 느낌은 tier 2 에서만 bloom 으로) · 가구가 천천히 Y 회전. 가구 전환 = 이전 가구 페이드아웃·다음 가구가 조명 안으로 슬라이드
- DOM 오버레이(캔버스 위): 현재 가구 `name` · `formatPrice` · `material`, `자세히 →` 링크 `/products/{slug}`. intro 에 카피 한 줄
- `prefers-reduced-motion`: 자동 회전 0, 전환은 t 보간 없이 즉시

- [ ] **Step 1: 실패 단위 테스트**
  ```ts
  it('0 은 intro', () => expect(showroomTimeline(0, 4)).toEqual({ phase: 'intro', t: 0 }));
  it('첫 가구 구간 한가운데', () => expect(showroomTimeline(1.5 / 7, 4)).toEqual({ phase: 'spotlight', index: 0, t: 0.5 }));   // count 4 → 총 7
  it('마지막 가구 다음은 reveal', () => expect(showroomTimeline(5.2 / 7, 4).phase).toBe('reveal'));
  it('끝은 explore', () => expect(showroomTimeline(1, 4)).toEqual({ phase: 'explore' }));
  it('범위 밖 clamp', () => { expect(showroomTimeline(-1, 4).phase).toBe('intro'); expect(showroomTimeline(2, 4)).toEqual({ phase: 'explore' }); });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** `timeline.ts` 구현 → **Step 4:** PASS
- [ ] **Step 5: 실패 e2e**
  ```ts
  test('스크롤하면 featured 가구 이름이 차례로 나온다', async ({ page }) => {
    await page.goto('/');
    const names = getFeatured().map(p => p.name);
    for (let i = 0; i < names.length; i++) {
      await page.evaluate(([i, n]) => { const s = document.querySelector('[data-testid=showroom]')!; window.scrollTo(0, s.getBoundingClientRect().top + scrollY + (s.scrollHeight - innerHeight) * ((1.5 + i) / (n + 3))); }, [i, names.length]);
      await expect(page.getByTestId('showroom-overlay')).toContainText(names[i]);
    }
  });
  test('오버레이의 자세히 링크는 상세로 간다', async ({ page }) => { /* 첫 가구 구간에서 '자세히' 클릭 → URL /products/{slug} */ });
  ```
- [ ] **Step 6:** `Showroom`·`ShowroomScene` 구현, `page.tsx` 교체 → e2e PASS. `?debug` 로 데스크톱 60fps 확인
- [ ] **Step 7:** 커밋 `feat: 쇼룸 도입과 스포트라이트 스크롤`

### Task 8: 쇼룸 — 방 공개 · 둘러보기

**Files:** Modify `src/showroom/ShowroomScene.tsx`, `src/showroom/layout.ts`, `tests/e2e/showroom.spec.ts`

**Interfaces:**
- Consumes: Task 7 `ShowroomState`
- Produces: `ROOM_LAYOUT: Record<string /*slug*/, { position: [number, number, number]; rotationY: number }>` — featured 전부 포함 (단위 테스트: `getFeatured().every(p => ROOM_LAYOUT[p.slug])`)
- reveal: t 에 따라 조명이 하나씩 켜지고(3~4개 포인트·면광원) 가구들이 ROOM_LAYOUT 위치로 이동, 카메라가 방 전체로 물러난다
- explore: drei `OrbitControls`(극각·거리 제한, 팬 끔) 활성. 가구 hover → 이름 라벨(drei `Html`), 클릭 → `router.push('/products/{slug}')`. 캔버스 밖 DOM 에 `내 방에 놓아 보기 (준비 중)` 비활성 버튼 — 3차 진입점 자리
- 모바일: explore 에서 한 손가락 드래그는 회전, 페이지 스크롤은 섹션 끝 아래로 계속된다 (`touch-action` 확인)

- [ ] **Step 1: 실패 테스트** — 단위(ROOM_LAYOUT 커버) + e2e: 맨 끝까지 스크롤 → `showroom-explore` 표시 → 캔버스 위 첫 가구 위치(`data-testid=room-hotspot-{slug}` 인 `Html` 마커) 클릭 → `/products/{slug}`
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 쇼룸 방 공개와 둘러보기`

### Task 9: 상품 목록

**Files:** Create `src/app/products/page.tsx`, `src/product/ProductCard.tsx`, `tests/e2e/products.spec.ts`

**Interfaces:**
- Consumes: Task 2 `getProducts`·`CATEGORY_LABEL`·`formatPrice`, Task 5 `posterUrl`
- 서버 컴포넌트. `searchParams.category` (Promise) → `getProducts`. 카테고리 탭(전체 + 6개, 현재 탭 강조, 링크 `?category=`). 카드: `next/image` 포스터 · 이름 · 가격 · 링크 `/products/{slug}`. 3D 없음 (목록은 가볍게)

- [ ] **Step 1: 실패 e2e**
  ```ts
  test('카테고리로 거른다', async ({ page }) => { await page.goto('/products?category=table'); /* 카드 수 = getProducts('table').length */ });
  test('모르는 카테고리는 전체', async ({ page }) => { await page.goto('/products?category=zzz'); /* 카드 수 = getProducts().length */ });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 상품 목록과 카테고리`

### Task 10: 상품 상세 · 3D 뷰어 · 치수

**Files:** Create `src/app/products/[slug]/{page,not-found}.tsx`, `src/product/ProductViewer.tsx`, `tests/e2e/product.spec.ts`

**Interfaces:**
- Consumes: Task 2 `getProduct`, Task 4 `Stage3D`, Task 6 `ProductModel`
- `generateStaticParams` 로 전 상품 정적 생성. 없는 slug → `notFound()`
- 왼쪽(모바일은 위) 3D 뷰어: `OrbitControls`(회전·확대, 팬 끔), 스포트라이트 + HDRI(`public/hdri/studio_1k.hdr`) 환경광. `치수 보기` 토글 → 바운딩 박스 세 변에 `W 1,571 · H 658 · D 797 mm` 식 라벨(`dimensionsMm` 반올림, drei `Html`)
- 오른쪽: 카테고리 · 이름 · 가격 · 소재 · 설명 · `장바구니 담기 (준비 중)` 비활성 버튼 · 출처 줄 `3D model: {polyhavenId} — Poly Haven` 링크 `https://polyhaven.com/a/{polyhavenId}`

- [ ] **Step 1: 실패 e2e**
  ```ts
  test('상세에 이름·가격·출처가 있다', async ({ page }) => { const p = getProducts()[0]; await page.goto(`/products/${p.slug}`); await expect(page.getByRole('heading', { name: p.name })).toBeVisible(); await expect(page.getByText(formatPrice(p.priceKRW))).toBeVisible(); await expect(page.locator(`a[href="https://polyhaven.com/a/${p.polyhavenId}"]`)).toBeVisible(); });
  test('치수 토글', async ({ page }) => { /* 클릭 → 'mm' 라벨 3개 */ });
  test('없는 slug 는 404', async ({ page }) => { const r = await page.goto('/products/nope'); expect(r!.status()).toBe(404); });
  ```
- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: 상품 상세 3D 뷰어와 치수`

### Task 11: 측정 기록 · README · 배포

**Files:** Create `docs/perf/phase1.md`, `README.md`; Vercel 프로젝트

- [ ] **Step 1:** 측정 — 쇼룸 끝까지 스크롤하는 동안 HUD fps 평균을 기록. 조합: (데스크톱 / 저사양 기준 기기 / 중급 폰) × (`?adaptive=off&tier=2` / 기본). 첫 화면 LCP 는 Lighthouse 모바일. 저사양 기준 기기는 실제로 가진 기기 중 가장 약한 것을 기기명과 함께 적는다
- [ ] **Step 2:** `docs/perf/phase1.md` 에 표로 기록. 목표(데스크톱 60 · 저사양 30 이상) 미달이면 **여기서 멈추고** 원인과 함께 보고한다
- [ ] **Step 3:** README — 소개 · 스크린샷 · 기술적 포인트(WebGPU→WebGL2→이미지 3단 폴백, 품질 자동 조절과 측정표) · 실행 방법(`npm run assets` 포함) · Poly Haven 출처
- [ ] **Step 4:** `npm run check && npm run build && npm run test:e2e` 전부 PASS
- [ ] **Step 5:** Vercel 배포 (`vercel` 링크·배포는 사용자 계정 — 사용자 확인 후). 배포 URL 에서 홈·목록·상세 수동 확인, 휴대폰 실기기에서 쇼룸 스크롤
- [ ] **Step 6:** 커밋 `docs: 1차 성능 측정 · README`
- 포트폴리오 카드 교체는 이 저장소 밖의 별도 작업이다 (스펙 8장)
