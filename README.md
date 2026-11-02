# LUMEN — 3D 가구 쇼룸

**라이브:** https://lumen.vercel.app

어두운 쇼룸에서 스포트라이트 아래의 가구를 3D 로 둘러보는 가구 쇼핑몰.
스크롤하면 가구가 하나씩 조명 아래로 들어오고, 마지막엔 불이 켜지며 그 가구들이 놓인 방이 드러난다.

> 1차 범위: 쇼룸 · 상품 목록 · 상품 상세(3D 회전·확대·치수) · 기기별 품질 자동 조절.
> 로그인·장바구니·테스트 결제(2차), 소재 바꾸기·내 방에 놓아 보기(3차)는 다음 단계다.

## 기술적 포인트

### 1. 렌더러 3단 폴백 — WebGPU → WebGL2 → 이미지
- Three.js `WebGPURenderer` 하나로 그린다. WebGPU 어댑터를 못 얻으면(미지원·블록리스트 GPU) `forceWebGL` 로 WebGL2 백엔드
- 둘 다 안 되면 3D 대신 포스터 이미지. 쇼룸의 상품 정보·링크는 그대로 읽힌다
- 그래서 셰이더는 노드 머티리얼·TSL 만 쓴다. 후처리(bloom · GTAO)도 `RenderPipeline` + TSL

### 2. 품질 자동 조절 — 처음 판정 + 실행 중 조절
- 접속 시 GPU 등급(`detect-gpu`, 벤치마크 자체 호스팅)으로 시작 단계를 정한다. 모바일은 최대 mid
- 1초 창마다 평균 fps 를 재서 30 미만이면 한 단계 내리고, 두 창 연속 58 이상이면 올린다
- 탭을 숨겼던 구간(긴 창)과 시작 직후 2개 창(셰이더 컴파일·로딩)은 판단에서 뺀다 — 실제로 시작 직후 4fps 가 찍혀 최저로 떨어지던 문제를 잡았다
- 단계마다 해상도(DPR) · 그림자 · bloom · AO · 모델 텍스처(1k/2k)가 바뀐다

| 단계 | DPR | 그림자 | bloom | AO | 텍스처 |
|---|---|---|---|---|---|
| low | 1 | 끔 | 끔 | 끔 | 1k |
| mid | 1–1.5 | 1024 | 켬 | 끔 | 1k |
| high | 1–2 | 2048 | 켬 | 켬 | 2k |

### 3. 에셋 파이프라인
- 런타임에 원본을 받지 않는다. `npm run assets` 가 Poly Haven API 에서 받아 `gltf-transform` 으로 압축
  (dedup · prune · weld · WebP 텍스처 · meshopt) → `public/models/{id}/{1k,2k}.glb`
- 20개 모델 총 33MB, 1k 는 모두 2MB 이하. 항상 1k 를 먼저 그리고 high 단계면 2k 로 바꾼다

### 4. 첫 화면을 막지 않는 3D
- 3D 초기화를 `load` 뒤 유휴 시간까지 미뤄 글자가 먼저 그려진다 — Lighthouse 모바일 TBT 9.7s → 0.9s, LCP 16.2s → 5.8s
- 측정 전체: [`docs/perf/phase1.md`](./docs/perf/phase1.md)

## 실행

```bash
npm install
npm run assets     # 처음 한 번 (생성물은 커밋돼 있어 보통 건너뛴다)
npm run dev
```

- `?debug` — 우상단에 백엔드 · 품질 단계 · fps
- `?tier=0|1|2` 품질 고정, `?adaptive=off` 자동 조절 끔, `?renderer=webgl2|none` 백엔드 강제

검사: `npm run check` (lint · 타입 · 단위) · `npm run test:e2e` (Playwright)

## 스택

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind 4 ·
three 0.187 (`three/webgpu`, `three/tsl`) · React Three Fiber 9 · drei · zustand · Vitest · Playwright

## 출처

3D 모델·텍스처·HDRI: [Poly Haven](https://polyhaven.com) (CC0). 상품 이름·가격·설명은 가짜 데이터다.
