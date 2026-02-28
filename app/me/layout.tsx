"use client";

import type { ReactNode } from "react";

import { Navbar } from "@/app/components/navbar";
import { ShopProvider } from "@/app/shop/contexts/ShopContext";
import { ShopNavbar } from "@/app/shop/components/ShopNavbar";
import { getShopSlugFromParams } from "@/app/lib/shop-context";

export default function MeLayout({ children }: { children: ReactNode }) {
  const shopSlug =
    typeof window === "undefined"
      ? null
      : getShopSlugFromParams(new URLSearchParams(window.location.search));

  if (shopSlug) {
    return (
      <ShopProvider key={`me-${shopSlug}`} slug={shopSlug}>
        <ShopNavbar />
        <main className="min-h-screen bg-page text-text-main">
          {children}
        </main>
      </ShopProvider>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-main">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
