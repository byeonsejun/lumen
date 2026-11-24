import type { Metadata } from "next";
import { ogFor } from "@/seo/share";
import { getFeatured } from "@/catalog/query";
import { Showroom } from "@/showroom/Showroom";

// 제목 · 설명은 layout 기본값을 쓴다. 정본만 홈 주소로 못박는다
export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: ogFor("/") };

export default function Home() {
  return <Showroom products={getFeatured()} />;
}
