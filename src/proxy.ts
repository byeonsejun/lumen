import { NextResponse } from "next/server";
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
export const proxy = auth(async (request) => {
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

export const config = { matcher: ["/products/:slug", "/checkout", "/checkout/:path*", "/orders", "/orders/:path*"] };
