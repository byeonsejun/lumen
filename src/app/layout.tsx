import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { AccountMenu } from "@/auth-ui/AccountMenu";
import { Providers } from "@/auth-ui/Providers";
import { CartBadge } from "@/cart/ui/CartBadge";
import { CartToast } from "@/cart/ui/CartToast";
import "./globals.css";
import { NAV_ITEM } from "@/auth-ui/nav-item";
import { isPreviewDeploy } from "@/seo/indexing";
import { SITE_URL } from "@/seo/site";

const sans = Noto_Sans_KR({ variable: "--font-sans-kr", subsets: ["latin"], weight: ["300", "400", "600"] });
// 제목 글꼴 — 어두운 갤러리에 놓인 가구 이름표처럼. 본문 · 버튼 · 숫자는 산세리프 그대로
const serif = Noto_Serif_KR({ variable: "--font-serif-kr", subsets: ["latin"], weight: ["300", "400"], display: "swap" });

const DESCRIPTION = "조명 아래에서 가구를 3D로 둘러보는 가구 쇼핑몰";
const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "어두운 쇼룸에서 조명 아래 놓인 3D 가구" };

export const metadata: Metadata = {
  // 상대 경로(정본 주소 · og:image)를 운영 도메인 기준 절대 주소로 풀어 준다
  metadataBase: new URL(SITE_URL),
  // 페이지는 "Shop" 처럼 이름만 적는다 — 사이트 이름 접미어는 여기서 한 번만 붙인다
  title: { default: "LUMEN — 3D 가구 쇼룸", template: "%s — LUMEN" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "LUMEN", locale: "ko_KR", description: DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE] },
  // 미리보기 배포는 통째로 색인에서 뺀다. robots 는 하위 페이지가 정하면 통째로 덮이므로(병합 안 됨) 공개 페이지는 건드리지 않는다
  ...(isPreviewDeploy(process.env.VERCEL_ENV) && { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable} antialiased`}>
      <body className="flex min-h-svh flex-col font-sans">
        <Providers>
        <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 text-sm sm:px-8">
          <Link href="/" className={`${NAV_ITEM} -ml-1.5 font-semibold tracking-[0.3em] sm:ml-0`}>
            LUMEN
          </Link>
          <nav className="flex items-center gap-1 text-muted sm:gap-6">
            <Link href="/products" className={NAV_ITEM}>
              Shop
            </Link>
            <CartBadge />
            <AccountMenu />
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line px-5 py-6 text-xs text-muted sm:px-8">
          3D assets:{" "}
          <a href="https://polyhaven.com" className="underline hover:text-fg" target="_blank" rel="noreferrer">
            Poly Haven (polyhaven.com)
          </a>
          {" · "}CC0
          {" · "}
          {/* 좁은 화면에서 "개인정보처리방" / "침" 으로 끊기지 않게 링크는 한 덩어리로 넘긴다 */}
          <Link href="/privacy" className="whitespace-nowrap underline hover:text-fg">
            개인정보처리방침
          </Link>
          <p className="mt-2">Copyright © 2026 BYUN SEJUN. All Rights Reserved.</p>
        </footer>
        <CartToast />
        </Providers>
      </body>
    </html>
  );
}
