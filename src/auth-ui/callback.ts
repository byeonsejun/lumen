/** 로그인 뒤 돌아갈 곳 — 같은 사이트의 경로만 받는다 */
export function safeCallbackUrl(v: string | null | undefined, fallback = "/"): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
