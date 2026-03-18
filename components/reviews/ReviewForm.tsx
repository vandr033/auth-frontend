"use client";

import { useState } from "react";
import { Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { useApi } from "@/app/hooks/useApi";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import type { EligibleBooking, CreateReviewPayload } from "@/types/review";

interface ReviewFormProps {
  booking: EligibleBooking;
  onSuccess: () => void;
  onCancel?: () => void;
}

const Stars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <Rating value={value} onValueChange={onChange}>
    <RatingButton size={28} />
    <RatingButton size={28} />
    <RatingButton size={28} />
    <RatingButton size={28} />
    <RatingButton size={28} />
  </Rating>
);

const MiniStars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <Rating value={value} onValueChange={onChange}>
    <RatingButton size={20} />
    <RatingButton size={20} />
    <RatingButton size={20} />
    <RatingButton size={20} />
    <RatingButton size={20} />
  </Rating>
);

export function ReviewForm({ booking, onSuccess, onCancel }: ReviewFormProps) {
  const t = useT();
  const api = useApi();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showSubRatings, setShowSubRatings] = useState(false);
  const [ratingServiceQuality, setRatingServiceQuality] = useState(0);
  const [ratingStaffAttention, setRatingStaffAttention] = useState(0);
  const [ratingPunctuality, setRatingPunctuality] = useState(0);
  const [ratingCleanliness, setRatingCleanliness] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const serviceName = booking.booking_services?.[0]?.service?.name;

  const handleSubmit = async () => {
    if (rating === 0) {
      void notify.error(t("reviewForm.ratingRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateReviewPayload = {
        booking_id: booking.id,
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
        ...(ratingServiceQuality > 0 && { rating_service_quality: ratingServiceQuality }),
        ...(ratingStaffAttention > 0 && { rating_staff_attention: ratingStaffAttention }),
        ...(ratingPunctuality > 0 && { rating_punctuality: ratingPunctuality }),
        ...(ratingCleanliness > 0 && { rating_cleanliness: ratingCleanliness }),
      };

      await api.post("/review", payload as unknown as Record<string, unknown>);
      void notify.success(t("reviewForm.success"));
      onSuccess();
    } catch (err) {
      void notify.error(err instanceof Error ? err.message : t("reviewForm.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-surface-border bg-surface text-text-main shadow-card">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-muted">{t("reviewForm.reviewFor")}</p>
          <p className="font-semibold text-text-main">{booking.company.name}</p>
          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            {serviceName && <span>{serviceName}</span>}
            {booking.staff && (
              <>
                <span>·</span>
                <span>{booking.staff.display_name}</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall rating */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-main">
            {t("reviewForm.overallRating")} <span className="text-rose-500">*</span>
          </label>
          <Stars value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {t(`reviewForm.ratingLabel${rating}`)}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-main">
            {t("reviewForm.comment")}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("reviewForm.commentPlaceholder")}
            maxLength={2000}
            rows={3}
            className="w-full rounded-md border border-surface-border bg-page px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
          />
          <p className="mt-1 text-xs text-text-muted text-right">{comment.length}/2000</p>
        </div>

        {/* Sub-ratings toggle */}
        <button
          type="button"
          onClick={() => setShowSubRatings(!showSubRatings)}
          className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover transition-colors"
        >
          {showSubRatings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {t("reviewForm.detailedRatings")}
        </button>

        {showSubRatings && (
          <div className="space-y-3 rounded-lg border border-surface-border bg-page/50 p-4">
            {([
              ["serviceQuality", ratingServiceQuality, setRatingServiceQuality],
              ["staffAttention", ratingStaffAttention, setRatingStaffAttention],
              ["punctuality", ratingPunctuality, setRatingPunctuality],
              ["cleanliness", ratingCleanliness, setRatingCleanliness],
            ] as const).map(([key, val, setter]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-text-main">
                  {t(`reviewForm.sub${(key as string).charAt(0).toUpperCase()}${(key as string).slice(1)}`)}
                </span>
                <MiniStars value={val as number} onChange={setter as (v: number) => void} />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1"
            >
              {t("reviewForm.cancel")}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 bg-brand text-white hover:bg-brand-hover"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {t("reviewForm.submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
