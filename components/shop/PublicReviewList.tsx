"use client";

import { useState, useEffect, useCallback } from "react";
import { useShop } from "@/app/shop/contexts/ShopContext";
import { useT } from "@/lib/i18n";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";

interface PublicReviewItem {
    id: number;
    rating: number;
    comment: string | null;
    rating_service_quality: number | null;
    rating_staff_attention: number | null;
    rating_punctuality: number | null;
    rating_cleanliness: number | null;
    created_at: string;
    user: { first_name: string | null; last_name: string | null; image: string | null };
    service: { id: number; name: string } | null;
    staff: { id: number; display_name: string } | null;
}

interface ReviewsPage {
    reviews: PublicReviewItem[];
    total: number;
    page: number;
    limit: number;
}

const ReadOnlyStars = ({ value, size = 14 }: { value: number; size?: number }) => (
    <Rating value={value} readOnly>
        <RatingButton size={size} />
        <RatingButton size={size} />
        <RatingButton size={size} />
        <RatingButton size={size} />
        <RatingButton size={size} />
    </Rating>
);

function formatReviewerName(user: PublicReviewItem["user"]): string {
    const first = user.first_name ?? "";
    const lastInitial = user.last_name ? `${user.last_name.charAt(0)}.` : "";
    const name = [first, lastInitial].filter(Boolean).join(" ");
    return name || "Customer";
}

export function PublicReviewList() {
    const { company } = useShop();
    const t = useT();

    const [reviews, setReviews] = useState<PublicReviewItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const LIMIT = 5;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const resolveUrl = (path: string) => {
        const base = apiBase.endsWith("/api") ? apiBase.replace(/\/api$/, "") : apiBase;
        return `${base}${path}`;
    };

    const fetchPage = useCallback(
        async (p: number) => {
            if (!company?.id) return;
            setLoading(true);
            try {
                const res = await fetch(
                    resolveUrl(`/api/review/company/${company.id}?page=${p}&limit=${LIMIT}`),
                );
                if (!res.ok) return;
                const json = await res.json();
                const data: ReviewsPage = json.data ?? json;
                if (p === 1) {
                    setReviews(data.reviews);
                } else {
                    setReviews((prev) => [...prev, ...data.reviews]);
                }
                setTotal(data.total);
                setPage(p);
            } catch {
                // silent
            } finally {
                setLoading(false);
                setInitialLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [company?.id],
    );

    useEffect(() => {
        void fetchPage(1);
    }, [fetchPage]);

    if (initialLoading || reviews.length === 0) return null;

    const hasMore = reviews.length < total;

    return (
        <section className="py-10 md:py-16">
            <div className="mx-auto max-w-6xl px-4 md:px-8">
                <h3 className="mb-6 font-heading text-xl font-semibold text-text-main md:text-2xl">
                    {t("shopHome.customerReviews")}
                </h3>

                <div className="space-y-4">
                    {reviews.map((review) => {
                        const dateStr = new Date(review.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        });

                        return (
                            <div
                                key={review.id}
                                className="rounded-lg border border-surface-border bg-surface p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-medium text-sm text-text-main">
                                                {formatReviewerName(review.user)}
                                            </span>
                                            <span className="text-xs text-text-muted">{dateStr}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                                            {review.service && <span>{review.service.name}</span>}
                                            {review.staff && (
                                                <>
                                                    {review.service && <span>·</span>}
                                                    <span>{review.staff.display_name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <ReadOnlyStars value={review.rating} />
                                    </div>
                                </div>

                                {review.comment && (
                                    <p className="mt-2 text-sm text-text-main leading-relaxed">
                                        {review.comment}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {hasMore && (
                    <div className="mt-6 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => void fetchPage(page + 1)}
                            disabled={loading}
                            className="text-brand hover:text-brand-hover hover:bg-brand-soft-bg"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ChevronDown className="mr-2 h-4 w-4" />
                            )}
                            {t("shopHome.showMoreReviews")}
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
