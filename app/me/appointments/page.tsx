"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  User,
  Loader2,
  ChevronRight,
  XCircle,
  Edit2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSignInRedirectPath,
  getShopSlugFromParams,
} from "@/app/lib/shop-context";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { formatCurrencyFromCents } from "@/lib/currency";

type AppointmentService = {
  id: number;
  name: string;
  price_cents: number;
  duration_minutes: number;
};

type Appointment = {
  id: number;
  company: {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    currency?: string | null;
  };
  staff: {
    id: number;
    display_name: string;
    image_url: string | null;
  } | null;
  services: AppointmentService[];
  start_at: string;
  end_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_price_cents: number;
  notes: string | null;
  isPast: boolean;
  canCancel: boolean;
  canModify: boolean;
  cancelLimitMinutes: number;
  rescheduleLimitMinutes: number;
  hasReview?: boolean;
  canReview?: boolean;
};

type AppointmentsData = {
  upcoming: Appointment[];
  past: Appointment[];
};

const formatPrice = (cents: number, currency?: string | null) =>
  formatCurrencyFromCents(cents, currency);

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  NO_SHOW: "bg-section text-text-muted border-surface-border",
};

function AppointmentCard({
  appointment,
  onCancel,
  cancelling,
  t,
}: {
  appointment: Appointment;
  onCancel?: (id: number) => void;
  cancelling?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const startDate = new Date(appointment.start_at);
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const totalDuration = appointment.services.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );
  const statusLabelByKey: Record<string, string> = {
    PENDING: "adminBookings.pending",
    CONFIRMED: "adminBookings.confirmed",
    COMPLETED: "adminBookings.completed",
    CANCELLED: "adminBookings.cancelled",
    NO_SHOW: "adminBookings.noShow",
  };

  return (
    <Card className="border-surface-border bg-surface text-text-main shadow-card transition-shadow hover:opacity-95">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: Date pill */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-brand/5 px-4 py-3 text-center shrink-0 min-w-[80px]">
            <span className="text-xs font-medium text-brand uppercase">
              {startDate.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="text-2xl font-bold text-brand">
              {startDate.getDate()}
            </span>
            <span className="text-xs text-brand/70">
              {startDate.toLocaleDateString("en-US", { month: "short" })}
            </span>
          </div>

          {/* Middle: Details */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Salon name */}
            <div className="flex items-center gap-2">
              <Link
                href={`/shop/${appointment.company.slug}`}
                className="truncate font-semibold text-text-main transition-colors hover:text-brand"
              >
                {appointment.company.name}
              </Link>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  statusColors[appointment.status] || statusColors.PENDING,
                )}
              >
                {statusLabelByKey[appointment.status] ? t(statusLabelByKey[appointment.status]) : appointment.status}
              </span>
            </div>

            {/* Services */}
            <div className="flex flex-wrap gap-1.5">
              {appointment.services.map((s) => (
                <span
                  key={s.id}
                  className="rounded bg-section px-2 py-0.5 text-xs text-text-muted"
                >
                  {s.name}
                </span>
              ))}
            </div>

            {/* Time + Staff + Duration */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeStr}
              </span>
              {appointment.staff && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {appointment.staff.display_name}
                </span>
              )}
              <span>{t("meAppointments.minutes", { count: totalDuration })}</span>
            </div>
          </div>

          {/* Right: Price + Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-lg font-bold text-text-main">
              {formatPrice(appointment.total_price_cents, appointment.company.currency)}
            </span>

            {!appointment.isPast && (
              <div className="flex gap-2">
                {appointment.canModify ? (
                  <Link
                    href={`/shop/${appointment.company.slug}/book?reschedule=${appointment.id}`}
                  >
                    <Button variant="outline" size="sm" className="text-xs">
                      <Edit2 className="h-3 w-3 mr-1" />
                      {t("meAppointments.modify")}
                    </Button>
                  </Link>
                ) : (
                  appointment.status !== "CANCELLED" &&
                  appointment.status !== "COMPLETED" && (
                    <span className="text-xs italic text-text-muted">
                      {t("meAppointments.withinRescheduleWindow", { minutes: appointment.rescheduleLimitMinutes })}
                    </span>
                  )
                )}

                {appointment.canCancel ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={() => onCancel?.(appointment.id)}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {t("meAppointments.cancel")}
                  </Button>
                ) : null}
              </div>
            )}

            {/* Review button for completed past bookings */}
            {appointment.isPast && appointment.status === "COMPLETED" && (
              <div>
                {appointment.hasReview ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <Star className="h-3 w-3 fill-current" />
                    {t("meAppointments.reviewed")}
                  </span>
                ) : appointment.canReview ? (
                  <Link href={`/me/reviews/new?bookingId=${appointment.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-brand border-brand/30 hover:bg-brand/5"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {t("meAppointments.writeReview")}
                    </Button>
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentsPageContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = getShopSlugFromParams(searchParams);
  const { loading: authLoading, isAuthenticated } = useAuth();
  const api = useApi();

  const [data, setData] = useState<AppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<{ data: AppointmentsData }>("/booking/my");
      setData(result.data);
    } catch (err) {
      void notify.error(err instanceof Error ? err.message : t("meAppointments.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(buildSignInRedirectPath("/me/appointments", shopSlug));
      return;
    }
    if (isAuthenticated) {
      void fetchAppointments();
    }
  }, [authLoading, isAuthenticated, router, fetchAppointments, shopSlug]);

  const handleCancel = async (bookingId: number) => {
    const result = await notify.confirm(t("meAppointments.cancelConfirm"), undefined, {
      variant: "destructive",
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
    });
    if (!result.isConfirmed) return;

    setCancellingId(bookingId);
    try {
      await api.post(`/booking/${bookingId}/cancel`);
      await fetchAppointments();
    } catch (err) {
      await notify.error(err instanceof Error ? err.message : t("meAppointments.cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const activeList = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-page text-text-main">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main">{t("meAppointments.title")}</h1>
          <p className="text-text-muted">{t("meAppointments.subtitle")}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-surface-border">
          <button
            onClick={() => setTab("upcoming")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "upcoming"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main",
            )}
          >
            {t("meAppointments.upcoming")} ({upcoming.length})
          </button>
          <button
            onClick={() => setTab("past")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "past"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main",
            )}
          >
            {t("meAppointments.past")} ({past.length})
          </button>
        </div>

        {/* Appointments List */}
        {activeList.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-text-muted/40" />
            <h3 className="mb-2 text-lg font-medium text-text-main">
              {tab === "upcoming"
                ? t("meAppointments.noUpcomingTitle")
                : t("meAppointments.noPastTitle")}
            </h3>
            <p className="mb-6 text-sm text-text-muted">
              {tab === "upcoming"
                ? t("meAppointments.noUpcomingDescription")
                : t("meAppointments.noPastDescription")}
            </p>
            {tab === "upcoming" && (
              <Link href={shopSlug ? `/shop/${shopSlug}` : "/"}>
                <Button className="bg-brand text-white hover:bg-brand-hover">
                  {t("meAppointments.browseShops")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeList.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={handleCancel}
                cancelling={cancellingId === appointment.id}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={(
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )}
    >
      <AppointmentsPageContent />
    </Suspense>
  );
}
