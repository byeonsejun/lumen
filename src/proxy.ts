import { NextResponse, type NextRequest } from "next/server";
import { getProduct } from "@/catalog/query";

/**
 * 없는 상품 주소를 렌더 전에 404 로 돌린다.
 * Cache Components 에선 미리 만들지 않은 slug 가 셸 스트리밍부터 시작해 notFound() 가 200 으로 나간다 (Next 문서 not-found 함수 항목)
 */
export function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");
  if (slug && !getProduct(slug)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/products/:slug" };
