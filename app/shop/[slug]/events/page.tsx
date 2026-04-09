"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { useSearchParams } from "next/navigation";
import { useShop } from "../../contexts/ShopContext";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { listPublicEvents, type PublicGroupEvent } from "@/app/shop/lib/groupReservationsApi";
import { GroupEventCard } from "@/app/shop/components/group/GroupPublicCards";
import { isEventSoldOut } from "@/app/shop/lib/groupReservationsFormat";

type EventFilter = "all" | "free" | "paid";

export default function ShopEventsPage() {
  const t = useT();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { company, slug, isShopActive, loading, error } = useShop();
  const plan = resolveShopPlan(company?.plan);
  const canSeeEvents = canUsePlanFeature(plan, "GROUP_EVENTS");

  // Read initial filter from URL (?free=true)
  const [activeFilter, setActiveFilter] = React.useState<EventFilter>(
    searchParams.get("free") === "true" ? "free" : "all",
  );

  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [events, setEvents] = React.useState<PublicGroupEvent[]>([]);

  const visibleEvents = React.useMemo(() => {
    const base = user?.id ? events : events.filter((event) => !isEventSoldOut(event));
    if (activeFilter === "free") return base.filter((e) => e.is_free);
    if (activeFilter === "paid") return base.filter((e) => !e.is_free);
    return base;
  }, [events, user?.id, activeFilter]);

  React.useEffect(() => {
    if (!company?.id || !canSeeEvents) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setEventsLoading(true);
      try {
        const data = await listPublicEvents(company.id, true);
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [canSeeEvents, company?.id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("shopHome.pageNotFound")}</h1>
          <p className="mt-2 text-sm text-text-muted">{error || t("shopHome.shopNotFoundMessage")}</p>
          <Link href={`/shop/${slug}`}>
            <Button className="mt-4 bg-brand text-white hover:bg-brand-hover">{t("shopGroup.actions.backToShop")}</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!isShopActive) {
    return <ShopUnavailableState slug={slug} />;
  }

  if (!canSeeEvents) {
    return (
      <main className="min-h-screen bg-page text-text-main">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8">
          <h1 className="text-3xl font-bold text-text-main">{t("shopGroup.events.title")}</h1>
          <p className="mt-3 text-sm text-text-muted">{t("shopGroup.events.notAvailable")}</p>
          <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}`}>{t("shopGroup.actions.backToShop")}</Link>
          </Button>
        </section>
        <ShopFooter />
      </main>
    );
  }

  const filters: { key: EventFilter; label: string }[] = [
    { key: "all", label: t("shopGroup.events.filterAll") },
    { key: "free", label: t("shopGroup.events.filterFree") },
    { key: "paid", label: t("shopGroup.events.filterPaid") },
  ];

  const heroImage = company.home_hero_image_url;

  return (
    <main className="min-h-screen bg-page text-text-main">
      {heroImage ? (
        <div
          className="relative px-4 pt-8 pb-10 md:px-8 md:pb-12"
          style={{
            backgroundImage: `url('${heroImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3">
            <Button asChild variant="outline" className="w-fit border-white/40 bg-white/10 text-white hover:bg-white/20">
              <Link href={`/shop/${slug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("shopGroup.actions.backToShop")}
              </Link>
            </Button>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{t("shopGroup.events.eyebrow")}</p>
            <h1 className="font-heading text-3xl font-bold text-white md:text-4xl">{t("shopGroup.events.title")}</h1>
            <p className="text-sm text-white/80">{t("shopGroup.events.subtitle")}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeFilter === key
                      ? "border-white bg-white text-black"
                      : "border-white/40 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <section className="border-b border-surface-border bg-surface py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 md:px-8">
            <Button asChild variant="outline" className="w-fit">
              <Link href={`/shop/${slug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("shopGroup.actions.backToShop")}
              </Link>
            </Button>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{t("shopGroup.events.eyebrow")}</p>
            <h1 className="font-heading text-3xl font-bold text-text-main md:text-4xl">{t("shopGroup.events.title")}</h1>
            <p className="text-sm text-text-muted">{t("shopGroup.events.subtitle")}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeFilter === key
                      ? "border-brand bg-brand text-white"
                      : "border-surface-border bg-surface text-text-muted hover:border-brand hover:text-brand"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
          </div>
        ) : visibleEvents.length === 0 ? (
          <p className="text-sm text-text-muted">{t("shopGroup.emptyEvents")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <GroupEventCard key={event.id} event={event} slug={slug} currency={company.currency} t={t} />
            ))}
          </div>
        )}
      </section>

      <ShopFooter />
    </main>
  );
}
