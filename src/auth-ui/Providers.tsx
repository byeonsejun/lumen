"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CartSync } from "@/cart/useCart";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartSync />
      {children}
    </SessionProvider>
  );
}
