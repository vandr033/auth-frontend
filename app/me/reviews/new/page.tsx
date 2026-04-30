"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import { useT } from "@/lib/i18n";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import type { EligibleBooking } from "@/types/review";
import { appendShopParam, buildSignInRedirectPath, getShopSlugFromParams } from "@/app/lib/shop-context";

function NewReviewContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = getShopSlugFromParams(searchParams);
  const bookingId = searchParams?.get("bookingId") ?? null;
  const { loading: authLoading, isAuthenticated } = useAuth();
  const api = useApi();

  const [booking, setBooking] = useState<EligibleBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const effectiveShopSlug = shopSlug || booking?.company.slug || null;

  useEffect(() => {
    if (shopSlug || !effectiveShopSlug || !bookingId) return;
    router.replace(appendShopParam(`/me/reviews/new?bookingId=${bookingId}`, effectiveShopSlug));
  }, [bookingId, effectiveShopSlug, router, shopSlug]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(buildSignInRedirectPath("/me/reviews/new", shopSlug));
      return;
    }

    if (!isAuthenticated || !bookingId) return;

    const fetchEligibility = async () => {
      try {
        const result = await api.get<{ eligible: boolean; reason?: string }>(
          `/review/check/${bookingId}`,
        );
        if (!result.eligible) {
          setError(result.reason || t("reviewForm.notEligible"));
          setLoading(false);
          return;
        }

        // Fetch the booking details from eligible list
        const eligibleResult = await api.get<{ data: EligibleBooking[] }>("/review/eligible");
        const found = eligibleResult.data?.find((b) => b.id === Number(bookingId));
        if (!found) {
          setError(t("reviewForm.notEligible"));
          setLoading(false);
          return;
        }

        setBooking(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("reviewForm.error"));
      } finally {
        setLoading(false);
      }
    };

    void fetchEligibility();
  }, [authLoading, isAuthenticated, bookingId, api, router, shopSlug, t]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-main">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link
          href={appendShopParam("/me/appointments", effectiveShopSlug)}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-main transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("reviewForm.backToAppointments")}
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-text-main">{t("reviewForm.title")}</h1>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm text-rose-700">{error}</p>
            <Link
              href={appendShopParam("/me/appointments", effectiveShopSlug)}
              className="mt-4 inline-block text-sm font-medium text-brand hover:text-brand-hover"
            >
              {t("reviewForm.backToAppointments")}
            </Link>
          </div>
        ) : booking ? (
          <ReviewForm
            booking={booking}
            onSuccess={() => router.push(appendShopParam("/me/reviews", effectiveShopSlug))}
            onCancel={() => router.back()}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      }
    >
      <NewReviewContent />
    </Suspense>
  );
}
