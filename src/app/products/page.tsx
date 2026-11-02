import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CATEGORY_LABEL, getProducts, type Category } from "@/catalog/query";
import { ProductCard } from "@/product/ProductCard";

export const metadata: Metadata = { title: "Shop — NOCTURNE" };

type SearchParams = Promise<{ category?: string | string[] }>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-24 sm:px-8">
      <h1 className="text-3xl font-light">Shop</h1>
      <Suspense fallback={<GridSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).category;
  const category = typeof raw === "string" && raw in CATEGORY_LABEL ? (raw as Category) : undefined;
  const products = getProducts(category);
  const tabs: { label: string; href: string; active: boolean }[] = [
    { label: "전체", href: "/products", active: !category },
    ...(Object.entries(CATEGORY_LABEL) as [Category, string][]).map(([c, label]) => ({
      label,
      href: `/products?category=${c}`,
      active: category === c,
    })),
  ];
  return (
    <>
      <nav aria-label="카테고리" className="mt-6 flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${t.active ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-sm bg-bg-raised" />
      ))}
    </div>
  );
}
