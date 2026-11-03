import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProduct } from "@/catalog/query";

const notFound = (url: string) => NextResponse.rewrite(new URL("/_not-found", url), { status: 404 });

/**
 * 응답이 시작되기 전에 판단해야 하는 것들을 여기서 한다.
 * Cache Components 에선 페이지 안의 notFound() · redirect() 가 셸 스트리밍 뒤라 상태 코드가 200 으로 나간다.
 * - 없는 상품 주소 → 404
 * - 주문서 · 주문 내역은 로그인 필요 → /login?callbackUrl=...
 */
export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/products/")) {
    const slug = decodeURIComponent(pathname.split("/")[2] ?? "");
    if (slug && !getProduct(slug)) return notFound(request.url);
    return NextResponse.next();
  }

  if (!request.auth?.viewer) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = { matcher: ["/products/:slug", "/checkout", "/checkout/:path*", "/orders", "/orders/:path*"] };
