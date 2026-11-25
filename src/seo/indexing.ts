/**
 * 검색에 내보내지 않는 경로 접두어(그 아래 전부 포함).
 * robots.txt 로 막지 않고 noindex 메타로 뺀다 — robots 로 막힌 주소는 크롤러가 페이지를 못 열어
 * noindex 를 읽지 못하고, 다른 곳의 링크 때문에 주소만 색인에 남을 수 있다.
 * 운영 코드는 이 목록을 읽지 않는다(각 화면이 noindex 를 직접 단다). 테스트가 대조하는 기준표다 —
 * 단위(seo-routes)는 robots · 사이트맵이 이 경로를 건드리지 않는지, e2e(seo.spec)는 이 경로가 모두 noindex 확인 대상에 들어 있는지 본다.
 * 비공개 화면을 늘리면 여기도 적어야 테스트가 따라온다.
 */
export const PRIVATE_PATHS: readonly string[] = ["/cart", "/checkout", "/orders", "/login"];

/** Vercel 미리보기 배포인가. 로컬(VERCEL_ENV 없음)과 운영은 색인 대상이다 */
export const isPreviewDeploy = (env?: string): boolean => env === "preview";
