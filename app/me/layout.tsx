"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { Navbar } from "@/app/components/navbar";
import { ShopProvider } from "@/app/shop/contexts/ShopContext";
import { ShopNavbar } from "@/app/shop/components/ShopNavbar";
import { getShopSlugFromParams } from "@/app/lib/shop-context";

function MeLayoutContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const shopSlug = getShopSlugFromParams(searchParams);

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

export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={(
      <div className="min-h-screen bg-page text-text-main">
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
      </div>
    )}
    >
      <MeLayoutContent>{children}</MeLayoutContent>
    </Suspense>
  );
}
