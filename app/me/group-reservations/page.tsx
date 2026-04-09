"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronRight, Loader2, RefreshCw, Ticket, Users } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { InstallmentPlanCard } from "@/app/shop/components/group/InstallmentPlanCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  buildSignInRedirectPath,
  getShopSlugFromParams,
} from "@/app/lib/shop-context";
import {
  getMyGroupPaymentPlans,
  getMyPublicGroupBookings,
  getMyPublicGroupEnrollments,
  resendMyClassTicket,
  type GroupBookingStatus,
  type GroupEnrollmentInstallmentPlan,
  type PublicGroupClassEnrollment,
  type PublicGroupEventBooking,
} from "@/app/shop/lib/groupReservationsApi";
import { formatGroupDate, formatGroupDateTime, formatGroupMoney } from "@/app/shop/lib/groupReservationsFormat";

type TabKey = "events" | "classes";

const statusClasses: Record<GroupBookingStatus, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  WAITLISTED: "bg-sky-50 text-sky-700 border-sky-200",
};

function GroupReservationsPageContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = getShopSlugFromParams(searchParams);
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<TabKey>("events");
  const [bookings, setBookings] = useState<PublicGroupEventBooking[]>([]);
  const [enrollments, setEnrollments] = useState<PublicGroupClassEnrollment[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<GroupEnrollmentInstallmentPlan[]>([]);
  const [ticketDialog, setTicketDialog] = useState<PublicGroupClassEnrollment["ticket"] | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [bookingsData, enrollmentsData, paymentPlansData] = await Promise.all([
        getMyPublicGroupBookings(),
        getMyPublicGroupEnrollments(),
        getMyGroupPaymentPlans(),
      ]);

      if (shopSlug) {
        setBookings(
          bookingsData.filter((booking) => booking.group_event?.company?.slug === shopSlug),
        );
        setEnrollments(
          enrollmentsData.filter((enrollment) => enrollment.group_class?.company?.slug === shopSlug),
        );
        setPaymentPlans(
          paymentPlansData.filter((plan) => plan.enrollment.company?.slug === shopSlug),
        );
      } else {
        setBookings(bookingsData);
        setEnrollments(enrollmentsData);
        setPaymentPlans(paymentPlansData);
      }
    } catch (err) {
      await notify.error(err instanceof Error ? err.message : t("meGroupReservations.loadError"));
      setBookings([]);
      setEnrollments([]);
      setPaymentPlans([]);
    } finally {
      setLoadingData(false);
    }
  }, [shopSlug, t]);

  const handleResendTicket = useCallback(async (enrollmentId: number) => {
    setResendingId(enrollmentId);
    try {
      await resendMyClassTicket(enrollmentId);
      await notify.success(t("meGroupReservations.ticket.resendSuccess"));
    } catch (err) {
      await notify.error(err instanceof Error ? err.message : t("meGroupReservations.ticket.resendError"));
    } finally {
      setResendingId(null);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(buildSignInRedirectPath("/me/group-reservations", shopSlug));
      return;
    }

    if (isAuthenticated) {
      void fetchData();
    }
  }, [authLoading, fetchData, isAuthenticated, router, shopSlug]);

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [bookings],
  );

  const sortedEnrollments = useMemo(
    () => [...enrollments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [enrollments],
  );

  const paymentPlanByEnrollmentId = useMemo(() => {
    const map = new Map<number, GroupEnrollmentInstallmentPlan>();
    paymentPlans.forEach((plan) => {
      map.set(plan.enrollment.id, plan);
    });
    return map;
  }, [paymentPlans]);

  const activeList = tab === "events" ? sortedBookings : sortedEnrollments;

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-main">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main">{t("meGroupReservations.title")}</h1>
            <p className="text-text-muted">{t("meGroupReservations.subtitle")}</p>
          </div>

          {shopSlug ? (
            <Button asChild variant="outline">
              <Link href={`/shop/${shopSlug}`}>{t("meGroupReservations.backToShop")}</Link>
            </Button>
          ) : null}
        </div>

        <div className="mb-6 flex border-b border-surface-border">
          <button
            onClick={() => setTab("events")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "events"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main",
            )}
          >
            {t("meGroupReservations.tabs.events")} ({sortedBookings.length})
          </button>
          <button
            onClick={() => setTab("classes")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "classes"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main",
            )}
          >
            {t("meGroupReservations.tabs.classes")} ({sortedEnrollments.length})
          </button>
        </div>

        {activeList.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface p-8 text-center shadow-card">
            <Users className="mx-auto mb-3 h-10 w-10 text-text-muted/60" />
            <h2 className="text-lg font-semibold text-text-main">{t("meGroupReservations.emptyTitle")}</h2>
            <p className="mt-2 text-sm text-text-muted">{t(`meGroupReservations.empty.${tab}`)}</p>
            <div className="mt-5">
              {shopSlug ? (
                <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                  <Link href={tab === "events" ? `/shop/${shopSlug}/events` : `/shop/${shopSlug}/classes`}>
                    {tab === "events" ? t("meGroupReservations.actions.browseEvents") : t("meGroupReservations.actions.browseClasses")}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                  <Link href="/">{t("meGroupReservations.actions.browseShops")}</Link>
                </Button>
              )}
            </div>
          </div>
        ) : tab === "events" ? (
          <div className="space-y-3">
            {sortedBookings.map((booking) => {
              const event = booking.group_event;
              const company = event?.company;
              const detailHref = event && company ? `/shop/${company.slug}/events/${event.id}` : null;
              const status = booking.status;

              return (
                <article
                  key={booking.id}
                  className="rounded-xl border border-surface-border bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text-main">{event?.title || t("meGroupReservations.labels.event")}</h3>
                      {company ? <p className="text-sm text-text-muted">{company.name}</p> : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        statusClasses[status],
                      )}
                    >
                      {t(`shopGroup.status.${status}`)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-text-muted">
                    {event?.start_at ? (
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {formatGroupDateTime(event.start_at, locale)}
                      </p>
                    ) : null}
                    <p>
                      {t("meGroupReservations.fields.spots")}: {booking.booked_spots}
                    </p>
                    <p>
                      {t("meGroupReservations.fields.total")}: {formatGroupMoney(booking.total_price_cents)}
                    </p>
                    <p>
                      {t("meGroupReservations.fields.paymentStatus")}: {t(`shopGroup.paymentStatus.${booking.payment_status}`)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {booking.source === "FREE_REGISTRATION"
                        ? t("meGroupReservations.ticket.freeRegistrationInfo")
                        : booking.status === "CONFIRMED"
                        ? t("meGroupReservations.ticket.confirmedInfo")
                        : t("meGroupReservations.ticket.pendingInfo")}
                    </p>
                    {booking.source === "FREE_REGISTRATION" && booking.reservation_code ? (
                      <p>
                        {t("freeEventReg.confirmation.codeLabel")}:{" "}
                        <span className="font-mono font-semibold text-text-main">{booking.reservation_code}</span>
                      </p>
                    ) : null}
                  </div>

                  {detailHref ? (
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={detailHref}>
                          {t("meGroupReservations.actions.openDetail")}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEnrollments.map((enrollment) => {
              const groupClass = enrollment.group_class;
              const company = groupClass?.company;
              const detailHref = groupClass && company ? `/shop/${company.slug}/classes/${groupClass.id}` : null;
              const status = enrollment.status;
              const paymentPlan = paymentPlanByEnrollmentId.get(enrollment.id);

              return (
                <article
                  key={enrollment.id}
                  className="rounded-xl border border-surface-border bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-text-main">{groupClass?.title || t("meGroupReservations.labels.class")}</h3>
                      {company ? <p className="text-sm text-text-muted">{company.name}</p> : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        statusClasses[status],
                      )}
                    >
                      {t(`shopGroup.status.${status}`)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-text-muted">
                    {groupClass ? (
                      <p>
                        {t("meGroupReservations.fields.pricingMode")}: {t(`shopGroup.pricing.${groupClass.pricing_mode}`)}
                      </p>
                    ) : null}
                    <p>
                      {t("meGroupReservations.fields.total")}: {formatGroupMoney(enrollment.price_cents_snapshot)}
                    </p>
                    <p>
                      {t("meGroupReservations.fields.validity")}: {formatGroupDate(enrollment.valid_from, locale)} - {formatGroupDate(enrollment.valid_until, locale)}
                    </p>
                    <p>
                      {t("meGroupReservations.fields.paymentStatus")}: {t(`shopGroup.paymentStatus.${enrollment.payment_status}`)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {enrollment.status === "CONFIRMED"
                        ? t("meGroupReservations.ticket.confirmedInfo")
                        : t("meGroupReservations.ticket.pendingInfo")}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {enrollment.status === "CONFIRMED" && enrollment.ticket ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTicketDialog(enrollment.ticket!)}
                        >
                          <Ticket className="mr-1 h-4 w-4" />
                          {t("meGroupReservations.ticket.viewTicket")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resendingId === enrollment.id}
                          onClick={() => void handleResendTicket(enrollment.id)}
                        >
                          <RefreshCw className={cn("mr-1 h-4 w-4", resendingId === enrollment.id && "animate-spin")} />
                          {t("meGroupReservations.ticket.resendTicket")}
                        </Button>
                      </>
                    ) : null}
                    {detailHref ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={detailHref}>
                          {t("meGroupReservations.actions.openDetail")}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  {paymentPlan ? (
                    <div className="mt-4">
                      <InstallmentPlanCard
                        plan={paymentPlan}
                        companyId={paymentPlan.enrollment.company_id}
                        locale={locale}
                        t={t}
                        onRefresh={fetchData}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!ticketDialog} onOpenChange={(open) => { if (!open) setTicketDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("meGroupReservations.ticket.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {ticketDialog && (
            <div className="flex flex-col items-center gap-4 py-2">
              <img
                src={ticketDialog.qr_image_url}
                alt="QR ticket"
                className="h-56 w-56 rounded-lg border border-surface-border bg-white p-2"
              />
              <div className="text-center">
                <p className="text-xs text-text-muted">{t("meGroupReservations.ticket.dialogCodeLabel")}</p>
                <p className="font-mono text-lg font-semibold tracking-widest text-text-main">
                  {ticketDialog.ticket_code}
                </p>
              </div>
              <p className="text-center text-sm text-text-muted">
                {t("meGroupReservations.ticket.dialogScanInstruction")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GroupReservationsPage() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}
    >
      <GroupReservationsPageContent />
    </Suspense>
  );
}
