"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShop } from "../contexts/ShopContext";
import { useT } from "@/lib/i18n";
import { HeroWrapper } from "@/components/shop/heroes/HeroWrapper";
import { QuickInfoBar } from "@/components/shop/QuickInfoBar";
import { ServicesWrapper } from "@/components/shop/services/ServicesWrapper";
import { TeamWrapper } from "@/components/shop/team/TeamWrapper";
import { ReviewsBanner } from "@/components/shop/ReviewsBanner";
import { LocationHours } from "@/components/shop/LocationHours";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { PublicReviewList } from "@/components/shop/PublicReviewList";
import { ShopUnavailableState } from "../components/ShopUnavailableState";
import {
    getRenderableHomeSectionKeys,
    resolveHomeSectionOrder,
} from "@/lib/storefront/home-sections";
import { getShopPublicFeatures } from "@/lib/storefront/public-features";
import { DEFAULT_SECTION_ORDER, type HomeSectionKey } from "@/types/shop";
import { useAuth } from "@/lib/useAuth";
import {
    listPublicClasses,
    listPublicClassSessions,
    listPublicEvents,
    type PublicGroupClass,
    type PublicGroupClassSession,
    type PublicGroupEvent,
} from "@/app/shop/lib/groupReservationsApi";
import { GroupClassCard, GroupEventCard } from "@/app/shop/components/group/GroupPublicCards";
import { isEventSoldOut } from "@/app/shop/lib/groupReservationsFormat";
import { StoreProductCard } from "@/components/shop/commerce/StoreProductCard";

export default function ShopPage() {
    const {
        company,
        hours,
        reviewStats,
        loading,
        error,
        slug,
        isShopActive,
        services,
        commerceProducts,
        commercePointsOfSale,
        staff,
        homeSectionOrder,
        publicFeatures,
    } = useShop();
    const t = useT();
    const { user } = useAuth();
    const resolvedPublicFeatures = company ? getShopPublicFeatures(company) : publicFeatures;
    const sectionOrder: HomeSectionKey[] = resolveHomeSectionOrder({
        storedOrder: homeSectionOrder ?? DEFAULT_SECTION_ORDER,
        availableKeys: getRenderableHomeSectionKeys(resolvedPublicFeatures),
        preferDefaultOrder: homeSectionOrder == null,
    });
    const canSeeReservas = resolvedPublicFeatures.servicesVisible;
    const canSeeCommerce = resolvedPublicFeatures.commerceVisible;
    const canSeeEvents = resolvedPublicFeatures.eventsVisible;
    const canSeeClasses = resolvedPublicFeatures.classesVisible;
    const [events, setEvents] = React.useState<PublicGroupEvent[]>([]);
    const [classes, setClasses] = React.useState<PublicGroupClass[]>([]);
    const [classSessionsById, setClassSessionsById] = React.useState<Record<number, PublicGroupClassSession[]>>({});
    const [groupsLoading, setGroupsLoading] = React.useState(false);
    const visibleEvents = React.useMemo(
        () => (user?.id ? events : events.filter((event) => event.is_free || !isEventSoldOut(event))),
        [events, user?.id],
    );
    const featuredProducts = React.useMemo(
        () => commerceProducts.filter((product) => product.is_featured).slice(0, 6),
        [commerceProducts],
    );
    const promoProducts = React.useMemo(
        () => commerceProducts.filter((product) => product.pricing?.promo_applied).slice(0, 6),
        [commerceProducts],
    );
    const comboProducts = React.useMemo(
        () => commerceProducts.filter((product) => product.product_type === "COMBO").slice(0, 6),
        [commerceProducts],
    );

    React.useEffect(() => {
        if (!company?.id || !isShopActive || (!canSeeEvents && !canSeeClasses)) {
            setEvents([]);
            setClasses([]);
            setClassSessionsById({});
            return;
        }

        let cancelled = false;

        const run = async () => {
            setGroupsLoading(true);
            try {
                if (canSeeEvents) {
                    const eventsData = await listPublicEvents(company.id, true);
                    if (!cancelled) setEvents(eventsData);
                } else if (!cancelled) {
                    setEvents([]);
                }

                if (canSeeClasses) {
                    const classesData = await listPublicClasses(company.id);
                    const sessions = await Promise.all(
                        classesData.map(async (item) => ({
                            classId: item.id,
                            sessions: await listPublicClassSessions(company.id, item.id),
                        })),
                    );
                    if (!cancelled) {
                        const byId: Record<number, PublicGroupClassSession[]> = {};
                        sessions.forEach(({ classId, sessions }) => {
                            byId[classId] = sessions;
                        });
                        const now = Date.now();
                        const visibleClasses = classesData
                            .filter((item) =>
                                (byId[item.id] ?? []).some((session) => {
                                    if (session.cancelled_at) return false;
                                    return new Date(session.start_at).getTime() >= now;
                                }),
                            )
                            .slice(0, 4);

                        setClasses(visibleClasses);
                        setClassSessionsById(byId);
                    }
                } else if (!cancelled) {
                    setClasses([]);
                    setClassSessionsById({});
                }
            } catch {
                if (!cancelled) {
                    setEvents([]);
                    setClasses([]);
                    setClassSessionsById({});
                }
            } finally {
                if (!cancelled) setGroupsLoading(false);
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [canSeeClasses, canSeeEvents, company?.id, isShopActive]);

    // Loading state
    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-text-muted">{t('shopHome.loadingShop')}</p>
                </div>
            </main>
        );
    }

    // Error state
    if (error || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">{t('shopHome.shopNotFound')}</h1>
                    <p className="text-text-muted mb-6">{error || t('shopHome.shopNotFoundMessage')}</p>
                    <Link href="/">
                        <Button className="bg-brand text-white hover:bg-brand-hover">
                            {t('shopHome.goHome')}
                        </Button>
                    </Link>
                </div>
            </main>
        );
    }

    if (!isShopActive) {
        return <ShopUnavailableState slug={slug} />;
    }

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* 1. Hero */}
            <HeroWrapper />

            {/* 2. Quick Info Bar */}
            <QuickInfoBar company={company} hours={hours} />

            {/* Reorderable sections */}
            {sectionOrder.map((key) => {
                if (key === 'about') {
                    if (!company.about_us_text) return null;
                    return (
                        <section key="about" className="py-10 md:py-14">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mx-auto max-w-3xl text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                        {t('shopHome.aboutUs')}
                                    </p>
                                    <p className="mt-3 font-heading text-xl leading-relaxed text-text-main md:text-2xl">
                                        {company.about_us_text}
                                    </p>
                                    <Link href={`/shop/${slug}/about`}>
                                        <Button variant="ghost" className="mt-4 text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t('shopHome.learnMore')} →
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </section>
                    );
                }
                if (key === 'services') {
                    if (!canSeeReservas || services.length === 0) return null;
                    return (
                        <section key="services" className="py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                            {t('shopHome.whatWeOffer')}
                                        </p>
                                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                            {t('shopHome.ourServices')}
                                        </h2>
                                    </div>
                                    <Link href={`/shop/${slug}/services`}>
                                        <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t('shopHome.viewAllServices')} →
                                        </Button>
                                    </Link>
                                </div>
                                <ServicesWrapper maxItems={6} />
                            </div>
                        </section>
                    );
                }
                if (key === 'products') {
                    const productsToShow = featuredProducts.length > 0 ? featuredProducts : commerceProducts.slice(0, 6);
                    if (!canSeeCommerce || productsToShow.length === 0) return null;
                    return (
                        <section key="products" className="py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                            {t("shopNav.store")}
                                        </p>
                                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                            {t("shopHome.featuredProducts")}
                                        </h2>
                                    </div>
                                    <Link href={`/shop/${slug}/store`}>
                                        <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t("shopHome.viewStore")} →
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {productsToShow.map((product) => (
                                        <StoreProductCard
                                            key={product.id}
                                            slug={slug}
                                            product={product}
                                            currency={company.currency}
                                            contextProducts={commerceProducts}
                                        />
                                    ))}
                                </div>
                            </div>
                        </section>
                    );
                }
                if (key === 'promotions') {
                    if (!resolvedPublicFeatures.commercePromotionsVisible || promoProducts.length === 0) return null;
                    return (
                        <section key="promotions" className="bg-section py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                            Promo
                                        </p>
                                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                            {t("shopHome.promoProducts")}
                                        </h2>
                                    </div>
                                    <Link href={`/shop/${slug}/store`}>
                                        <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t("shopHome.viewStore")} →
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {promoProducts.map((product) => (
                                        <StoreProductCard
                                            key={product.id}
                                            slug={slug}
                                            product={product}
                                            currency={company.currency}
                                            contextProducts={commerceProducts}
                                        />
                                    ))}
                                </div>
                            </div>
                        </section>
                    );
                }
                if (key === 'combos') {
                    if (!resolvedPublicFeatures.commerceCombosVisible || comboProducts.length === 0) return null;
                    return (
                        <section key="combos" className="py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                            Combos
                                        </p>
                                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                            {t("shopHome.comboProducts")}
                                        </h2>
                                    </div>
                                    <Link href={`/shop/${slug}/store`}>
                                        <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t("shopHome.viewStore")} →
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {comboProducts.map((product) => (
                                        <StoreProductCard
                                            key={product.id}
                                            slug={slug}
                                            product={product}
                                            currency={company.currency}
                                            contextProducts={commerceProducts}
                                        />
                                    ))}
                                </div>
                            </div>
                        </section>
                    );
                }
                if (key === 'events') {
                    if (!canSeeEvents || groupsLoading || visibleEvents.length === 0) return null;
                    return (
                        <section key="events" className="py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                            {t("shopGroup.events.eyebrow")}
                                        </p>
                                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                            {t("shopGroup.events.title")}
                                        </h2>
                                    </div>
                                    <Link href={`/shop/${slug}/events`}>
                                        <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t("shopGroup.actions.viewAllEvents")} →
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {visibleEvents.slice(0, 4).map((event) => (
                                        <GroupEventCard
                                            key={event.id}
                                            event={event}
                                            slug={slug}
                                            currency={company.currency}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </div>
                        </section>
                    );
                }
                if (key === 'classes') {
                    if (!canSeeClasses || groupsLoading || classes.length === 0) return null;
                    return (
                        <section key="classes" className="bg-section py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                            {t("shopGroup.classes.eyebrow")}
                                        </p>
                                        <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                            {t("shopGroup.classes.title")}
                                        </h2>
                                    </div>
                                    <Link href={`/shop/${slug}/classes`}>
                                        <Button variant="ghost" className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg">
                                            {t("shopGroup.actions.viewAllClasses")} →
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {classes.map((groupClass) => (
                                        <GroupClassCard
                                            key={groupClass.id}
                                            groupClass={groupClass}
                                            sessions={classSessionsById[groupClass.id] || []}
                                            slug={slug}
                                            currency={company.currency}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </div>
                        </section>
                    );
                }
                if (key === 'team') {
                    if (staff.length === 0) return null;
                    return (
                        <section key="team" className="bg-section py-10 md:py-16">
                            <div className="mx-auto max-w-6xl px-4 md:px-8">
                                <div className="mb-8">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted font-body">
                                        {t('shopHome.ourExperts')}
                                    </p>
                                    <h2 className="mt-2 font-heading text-2xl font-semibold text-text-main md:text-3xl">
                                        {t('shopHome.ourTeam')}
                                    </h2>
                                </div>
                                <TeamWrapper />
                            </div>
                        </section>
                    );
                }
                return null;
            })}

            {/* 6. Location & Hours */}
            <LocationHours company={company} hours={hours} pointsOfSale={canSeeCommerce ? commercePointsOfSale : []} />

            {/* 7. Reviews */}
            {reviewStats && reviewStats.count > 0 && (
                <ReviewsBanner reviewStats={reviewStats} />
            )}
            {reviewStats && reviewStats.count > 0 && (
                <PublicReviewList />
            )}

            {/* 8. Footer */}
            <ShopFooter />
        </main>
    );
}
