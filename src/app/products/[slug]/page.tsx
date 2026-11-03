import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, formatPrice, getProduct, getProducts } from "@/catalog/query";
import { ProductPurchase } from "@/product/ProductPurchase";
import { ProductViewer } from "@/product/ProductViewer";

type Params = Promise<{ slug: string }>;


export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = getProduct((await params).slug);
  return { title: product ? `${product.name} — LUMEN` : "LUMEN" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-20 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:pt-24">
      <ProductViewer product={product} />
      <div className="lg:pt-6">
        <Link href={`/products?category=${product.category}`} className="text-xs text-muted hover:text-fg">
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
          3D model:{" "}
          <a
            href={`https://polyhaven.com/a/${product.polyhavenId}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-fg"
          >
            {product.polyhavenId} — Poly Haven
          </a>
        </p>
      </div>
    </div>
  );
}
