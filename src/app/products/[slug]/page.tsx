import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, formatPrice, getProduct, getProducts } from "@/catalog/query";
import { ProductPurchase } from "@/product/ProductPurchase";
import { jsonLdScript, productImageUrl, productJsonLd } from "@/seo/jsonld";
import { ogFor } from "@/seo/share";
import { ProductViewer } from "@/product/ProductViewer";

type Params = Promise<{ slug: string }>;


export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  // 없는 slug 는 src/proxy.ts 가 여기까지 오기 전에 404 로 돌려 보내 실제로는 닿지 않는다.
  // 그래도 남겨 두는 건 방어용 — 닿더라도 템플릿("%s — LUMEN")을 건너뛰어야 "LUMEN — LUMEN" 이 안 된다
  if (!product) return { title: { absolute: "LUMEN" } };
  const path = `/products/${product.slug}`;
  // 상품마다 자기 사진으로 공유되게 한다. 페이지가 openGraph · twitter 를 지정하면 layout 것은 통째로 대체되므로 images 도 여기서 다시 준다
  const image = { url: productImageUrl(product), alt: product.name };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: path },
    openGraph: { ...ogFor(path), images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  return (
    <>
      {productJsonLd(product).map((data) => (
        <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
      ))}
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-20 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:pt-24 2xl:max-w-7xl">
        <ProductViewer product={product} />
        <div className="lg:pt-6">
          <Link href={`/products?category=${product.category}`} className="inline-flex min-h-6 items-center text-xs text-muted hover:text-fg">
            {CATEGORY_LABEL[product.category]}
          </Link>
          <h1 className="mt-2 text-3xl font-light">{product.name}</h1>
          <p className="mt-3 text-xl text-accent">{formatPrice(product.priceKRW)}</p>
          <p className="mt-6 leading-relaxed text-fg/85">{product.description}</p>
          <dl className="mt-6 grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted">소재</dt>
            <dd>{product.material}</dd>
            <dt className="text-muted">크기</dt>
            <dd>
              {product.dimensionsMm.map((v) => Math.round(v).toLocaleString("ko-KR")).join(" × ")} mm
              <span className="text-muted"> (가로 × 높이 × 깊이)</span>
            </dd>
          </dl>
          <ProductPurchase slug={product.slug} />
          <p className="mt-8 text-xs text-muted">
            3D 모델은{" "}
            <a
              href={`https://polyhaven.com/a/${product.polyhavenId}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-fg"
            >
              Poly Haven
            </a>
            의 CC0 에셋을 다듬어 썼어요
          </p>
        </div>
      </div>
    </>
  );
}
