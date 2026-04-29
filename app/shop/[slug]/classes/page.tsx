"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useShop } from "../../contexts/ShopContext";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { getShopPublicFeatures } from "@/lib/storefront/public-features";
import {
  listPublicClasses,
  listPublicClassSessions,
  type PublicGroupClass,
  type PublicGroupClassSession,
} from "@/app/shop/lib/groupReservationsApi";
import { GroupClassCard } from "@/app/shop/components/group/GroupPublicCards";
import { getImageUrl } from "@/utils/image-url";

function hasUpcomingSession(sessions: PublicGroupClassSession[]): boolean {
  const now = Date.now();
  return sessions.some((session) => {
    if (session.cancelled_at) return false;
    return new Date(session.start_at).getTime() >= now;
  });
}

export default function ShopClassesPage() {
  const t = useT();
  const { company, slug, isShopActive, loading, error, publicFeatures } = useShop();
  const canSeeClasses = getShopPublicFeatures(company).classesVisible || publicFeatures.classesVisible;

  const [classesLoading, setClassesLoading] = React.useState(true);
  const [classes, setClasses] = React.useState<PublicGroupClass[]>([]);
  const [sessionsByClassId, setSessionsByClassId] = React.useState<Record<number, PublicGroupClassSession[]>>({});

  React.useEffect(() => {
    if (!company?.id || !canSeeClasses) {
      setClasses([]);
      setSessionsByClassId({});
      setClassesLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setClassesLoading(true);
      try {
        const classesData = await listPublicClasses(company.id);

        const sessionsRows = await Promise.all(
          classesData.map(async (item) => ({
            classId: item.id,
            sessions: await listPublicClassSessions(company.id, item.id),
          })),
        );

        if (cancelled) return;

        const nextByClassId: Record<number, PublicGroupClassSession[]> = {};
        sessionsRows.forEach(({ classId, sessions }) => {
          nextByClassId[classId] = sessions;
        });

        const withUpcoming = classesData.filter((item) => hasUpcomingSession(nextByClassId[item.id] ?? []));

        setSessionsByClassId(nextByClassId);
        setClasses(withUpcoming);
      } catch {
        if (!cancelled) {
          setClasses([]);
          setSessionsByClassId({});
        }
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [canSeeClasses, company?.id]);

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

  if (!canSeeClasses) {
    return (
      <main className="min-h-screen bg-page text-text-main">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8">
          <h1 className="text-3xl font-bold text-text-main">{t("shopGroup.classes.title")}</h1>
          <p className="mt-3 text-sm text-text-muted">{t("shopGroup.classes.notAvailable")}</p>
          <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}`}>{t("shopGroup.actions.backToShop")}</Link>
          </Button>
        </section>
        <ShopFooter />
      </main>
    );
  }

  const heroImage = getImageUrl(company?.home_hero_image_url);

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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{t("shopGroup.classes.eyebrow")}</p>
            <h1 className="font-heading text-3xl font-bold text-white md:text-4xl">{t("shopGroup.classes.title")}</h1>
            <p className="text-sm text-white/80">{t("shopGroup.classes.subtitle")}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{t("shopGroup.classes.eyebrow")}</p>
            <h1 className="font-heading text-3xl font-bold text-text-main md:text-4xl">{t("shopGroup.classes.title")}</h1>
            <p className="text-sm text-text-muted">{t("shopGroup.classes.subtitle")}</p>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {classesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
          </div>
        ) : classes.length === 0 ? (
          <p className="text-sm text-text-muted">{t("shopGroup.emptyClasses")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((groupClass) => (
              <GroupClassCard
                key={groupClass.id}
                groupClass={groupClass}
                sessions={sessionsByClassId[groupClass.id] ?? []}
                slug={slug}
                currency={company.currency}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      <ShopFooter />
    </main>
  );
}
