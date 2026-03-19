"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Star, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { buildSignInRedirectPath, getShopSlugFromParams } from "@/app/lib/shop-context";
import { notify } from "@/lib/notify";
import type { CustomerReview, EligibleBooking } from "@/types/review";

function ReviewsPageContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = getShopSlugFromParams(searchParams);
  const { loading: authLoading, isAuthenticated } = useAuth();
  const api = useApi();

  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [eligible, setEligible] = useState<EligibleBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsRes, eligibleRes] = await Promise.all([
        api.get<{ data: CustomerReview[] }>("/review/my"),
        api.get<{ data: EligibleBooking[] }>("/review/eligible"),
      ]);
      setReviews(reviewsRes.data ?? []);
      setEligible(eligibleRes.data ?? []);
    } catch (err) {
      void notify.error(err instanceof Error ? err.message : t("reviewPage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(buildSignInRedirectPath("/me/reviews", shopSlug));
      return;
    }
    if (isAuthenticated) {
      void fetchData();
    }
  }, [authLoading, isAuthenticated, router, fetchData, shopSlug]);

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm(t("reviewPage.confirmDelete"))) return;
    try {
      await api.del(`/review/${reviewId}`);
      void notify.success(t("reviewPage.deleted"));
      void fetchData();
    } catch {
      void notify.error(t("reviewPage.deleteError"));
    }
  };

  if (authLoading || (loading && reviews.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-main">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main">{t("reviewPage.title")}</h1>
          <p className="text-text-muted">{t("reviewPage.subtitle")}</p>
        </div>

        {/* Pending reviews banner */}
        {eligible.length > 0 && (
          <div className="mb-6 rounded-lg border border-brand/20 bg-brand/5 p-4">
            <p className="text-sm font-medium text-text-main mb-3">
              {t("reviewPage.pendingCount", { count: eligible.length })}
            </p>
            <div className="space-y-2">
              {eligible.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface border border-surface-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-main truncate">
                      {booking.company.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(booking.end_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {booking.booking_services?.[0]?.service?.name && (
                        <> · {booking.booking_services[0].service.name}</>
                      )}
                    </p>
                  </div>
                  <Link href={`/me/reviews/new?bookingId=${booking.id}`}>
                    <Button
                      size="sm"
                      className="text-xs bg-brand text-white hover:bg-brand-hover shrink-0"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {t("reviewPage.writeReview")}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted reviews */}
        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-text-muted/40" />
            <h3 className="mb-2 text-lg font-medium text-text-main">
              {t("reviewPage.noReviewsTitle")}
            </h3>
            <p className="text-sm text-text-muted">
              {t("reviewPage.noReviewsDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} showCompany onDelete={handleDeleteReview} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      }
    >
      <ReviewsPageContent />
    </Suspense>
  );
}
