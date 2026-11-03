import type { Metadata } from "next";
import { CartView } from "@/cart/ui/CartView";

export const metadata: Metadata = { title: "장바구니 — LUMEN" };

export default function CartPage() {
  return <CartView />;
}
