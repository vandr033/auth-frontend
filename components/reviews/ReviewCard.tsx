"use client";

import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import type { PublicReview, CustomerReview } from "@/types/review";
import Link from "next/link";

interface ReviewCardProps {
  review: PublicReview | CustomerReview;
  showCompany?: boolean;
}

const ReadOnlyStars = ({ value, size = 16 }: { value: number; size?: number }) => (
  <Rating value={value} readOnly>
    <RatingButton size={size} />
    <RatingButton size={size} />
    <RatingButton size={size} />
    <RatingButton size={size} />
    <RatingButton size={size} />
  </Rating>
);

export function ReviewCard({ review, showCompany = false }: ReviewCardProps) {
  const t = useT();
  const authorName = [review.user.first_name, review.user.last_name].filter(Boolean).join(" ") || t("reviewPage.anonymous");
  const dateStr = new Date(review.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const company = "company" in review ? (review as CustomerReview).company : null;

  const subRatings = [
    { key: "serviceQuality", value: review.rating_service_quality },
    { key: "staffAttention", value: review.rating_staff_attention },
    { key: "punctuality", value: review.rating_punctuality },
    { key: "cleanliness", value: review.rating_cleanliness },
  ].filter((s) => s.value != null && s.value > 0);

  return (
    <Card className="border-surface-border bg-surface text-text-main shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Author + date */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-text-main truncate">{authorName}</span>
              <span className="text-xs text-text-muted">{dateStr}</span>
            </div>

            {/* Company link (for "My Reviews") */}
            {showCompany && company && (
              <Link
                href={`/shop/${company.slug}`}
                className="text-xs font-medium text-brand hover:text-brand-hover transition-colors"
              >
                {company.name}
              </Link>
            )}

            {/* Service + Staff */}
            <div className="flex flex-wrap gap-2 text-xs text-text-muted mt-0.5">
              {review.service && <span>{review.service.name}</span>}
              {review.staff && (
                <>
                  {review.service && <span>·</span>}
                  <span>{review.staff.display_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Overall rating */}
          <div className="shrink-0">
            <ReadOnlyStars value={review.rating} />
          </div>
        </div>

        {/* Comment */}
        {review.comment && (
          <p className="mt-3 text-sm text-text-main leading-relaxed">{review.comment}</p>
        )}

        {/* Sub-ratings */}
        {subRatings.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {subRatings.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-text-muted">
                <span>{t(`reviewForm.sub${key.charAt(0).toUpperCase()}${key.slice(1)}`)}</span>
                <ReadOnlyStars value={value!} size={12} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
