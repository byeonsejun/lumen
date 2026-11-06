import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProduct } from "@/catalog/query";
import { db } from "@/server/db";

const notFound = (url: string) => NextResponse.rewrite(new URL("/_not-found", url), { status: 404 });

/**
 * 응답이 시작되기 전에 판단해야 하는 것들을 여기서 한다.
 * Cache Components 에선 페이지 안의 notFound() · redirect() 가 셸 스트리밍 뒤라 상태 코드가 200 으로 나간다.
 * - 없는 상품 주소 → 404
 * - 주문서 · 주문 내역은 로그인 필요 → /login?callbackUrl=...
 * - 남의 주문 · 없는 주문 → 404
 */
const gate = auth(async (request) => {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/products/")) {
    const slug = decodeURIComponent(pathname.split("/")[2] ?? "");
    if (slug && !getProduct(slug)) return notFound(request.url);
    return NextResponse.next();
  }

  const viewer = request.auth?.viewer;
  if (!viewer) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(login);
  }

  // 주문 상세 · 완료 — 내 주문이 아니거나 없으면 404 (남의 주문 id 를 알아도 볼 수 없다)
  const orderId = pathname.match(/^\/orders\/([^/]+)/)?.[1];
  if (orderId) {
    const mine = await db().order.findFirst({ where: { id: decodeURIComponent(orderId), userId: viewer.id }, select: { id: true } });
    if (!mine) return notFound(request.url);
  }
  return NextResponse.next();
});

/**
 * auth() 래퍼는 응답마다 세션 쿠키를 새 만료로 다시 심는다. 그런데 헤더의 '내 주문' 프리패치가
 * 로그아웃 요청보다 먼저 출발해 늦게 도착하면, 그 쿠키가 방금 지운 세션을 되살려 로그아웃이 안 됐다.
 * 여기선 세션을 읽기만 한다 — 만료 연장은 페이지마다 부르는 /api/auth/session 이 맡는다
 */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // 래퍼 타입은 라우트 핸들러용으로 잡혀 있지만, 미들웨어로 부르면 늘 Response 를 돌려준다
  const res = (await gate(request, event as never)) as Response;
  const cookies = res.headers.getSetCookie();
  const keep = cookies.filter((c) => !/^(__Secure-)?authjs\.session-token(\.\d+)?=/.test(c));
  if (keep.length === cookies.length) return res;
  const out = new Response(res.body, res);
  out.headers.delete("set-cookie");
  for (const c of keep) out.headers.append("set-cookie", c);
  return out;
}

export const config = { matcher: ["/products/:slug", "/checkout", "/checkout/:path*", "/orders", "/orders/:path*"] };
