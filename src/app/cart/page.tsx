import type { Metadata } from "next";
import { CartView } from "@/cart/ui/CartView";

export const metadata: Metadata = { title: "장바구니", robots: { index: false, follow: false } };

export default function CartPage() {
  return <CartView />;
}
