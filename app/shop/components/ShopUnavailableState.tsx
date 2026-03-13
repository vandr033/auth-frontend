"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

type ShopUnavailableStateProps = {
  slug: string;
};

export function ShopUnavailableState({ slug }: ShopUnavailableStateProps) {
  const t = useT();

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-page px-4 text-text-main">
      <div className="w-full max-w-xl rounded-2xl border border-surface-border bg-surface p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("shopAvailability.title")}
        </h1>
        <p className="mt-3 text-base text-text-muted md:text-lg">
          {t("shopAvailability.subtitle")}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href={`/shop/${slug}`}>
            <Button variant="outline">{t("shopAvailability.viewShopHome")}</Button>
          </Link>
          <Link href="/">
            <Button className="bg-brand text-white hover:bg-brand-hover">
              {t("shopHome.goHome")}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
