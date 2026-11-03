/** Vercel 이 붙여 주는 헤더에서 손님 IP. x-forwarded-for 는 "손님, 프록시, …" 순이다 */
export function clientIp(headers: Headers): string | null {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || null;
}
