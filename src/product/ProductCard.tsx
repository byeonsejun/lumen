import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABEL, formatPrice, type Product } from "@/catalog/query";
import { posterUrl } from "@/three/models";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link data-testid="product-card" href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-sm bg-[radial-gradient(ellipse_at_50%_35%,#2a2420,#0f0d0b_70%)]">
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
