import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABEL, formatPrice, type Product } from "@/catalog/query";
import { posterUrl } from "@/three/models";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link data-testid="product-card" href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-sm bg-[radial-gradient(ellipse_at_50%_35%,#2a2420,#0f0d0b_70%)]">
        {/* 올려 두면 쇼룸처럼 가구 아래에 빛이 고인다 */}
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_50%_22%_at_50%_86%,rgba(232,182,121,0.28),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
        <Image
          src={posterUrl(product.polyhavenId, 640)}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-3 text-xs text-muted">{CATEGORY_LABEL[product.category]}</p>
      <h2 className="mt-1 text-sm group-hover:text-accent">{product.name}</h2>
      <p className="mt-1 text-sm text-accent">{formatPrice(product.priceKRW)}</p>
    </Link>
  );
}
