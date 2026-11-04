import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_KR } from "next/font/google";
import { AccountMenu } from "@/auth-ui/AccountMenu";
import { Providers } from "@/auth-ui/Providers";
import { CartBadge } from "@/cart/ui/CartBadge";
import { CartToast } from "@/cart/ui/CartToast";
import "./globals.css";
import { NAV_ITEM } from "@/auth-ui/nav-item";

const sans = Noto_Sans_KR({ variable: "--font-sans-kr", subsets: ["latin"], weight: ["300", "400", "600"] });

export const metadata: Metadata = {
  title: "LUMEN — 3D 가구 쇼룸",
  description: "조명 아래에서 가구를 3D로 둘러보는 가구 쇼핑몰",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sans.variable} antialiased`}>
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
          <Link href="/privacy" className="underline hover:text-fg">
            개인정보처리방침
          </Link>
        </footer>
        <CartToast />
        </Providers>
      </body>
    </html>
  );
}
