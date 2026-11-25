import { getProducts } from "@/catalog/query";
import { buildLlmsTxt } from "@/seo/llms";

// 카탈로그가 코드에 박혀 있어 요청마다 만들 이유가 없다. cacheComponents 가 켜져 있으면
// `dynamic = "force-static"` 은 빌드 오류라 쓰지 않는다 — 요청 데이터를 안 읽는 GET 은 빌드 때 한 번 만들어진다
export function GET() {
  return new Response(buildLlmsTxt(getProducts()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
