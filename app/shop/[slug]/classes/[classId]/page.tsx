"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Loader2, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapboxLocationPreview } from "@/components/maps/MapboxLocationPreview";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useAuth } from "@/lib/useAuth";
import { useShop } from "../../../contexts/ShopContext";
import { ShopUnavailableState } from "../../../components/ShopUnavailableState";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { appendShopParam, buildSignInRedirectFromCurrentLocation } from "@/app/lib/shop-context";
import {
  createPublicClassEnrollment,
  deleteGroupQrProof,
  getMyPublicGroupEnrollments,
  getPublicClassById,
  listPublicClassSessions,
  type GroupPaymentMethod,
  type PublicGroupClass,
  type PublicGroupClassEnrollment,
  type PublicGroupClassSession,
  uploadGroupQrProof,
} from "@/app/shop/lib/groupReservationsApi";
import {
  formatGroupDate,
  formatGroupDateTime,
  formatGroupMoney,
  getGroupItemImage,
  getRecurrenceSummary,
  getStaffDisplayName,
  getStaffDisplayPhone,
  getVisibleStaffAssignments,
} from "@/app/shop/lib/groupReservationsFormat";
import { GroupPaymentMethodForm } from "@/app/shop/components/group/GroupPaymentMethodForm";
import { getImageUrl } from "@/utils/image-url";

type NoticeTone = "success" | "warning" | "error";

function hasUpcomingSession(sessions: PublicGroupClassSession[]): boolean {
  const now = Date.now();
  return sessions.some((session) => {
    if (session.cancelled_at) return false;
    return new Date(session.start_at).getTime() >= now;
  });
}

function getSessionMaxCapacity(session: PublicGroupClassSession, fallback: number): number {
  return session.max_capacity ?? fallback;
}

export default function ShopClassDetailPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const classId = Number.parseInt(params?.classId || "", 10);

  const { user, loading: authLoading } = useAuth();
  const { company, settings, slug, isShopActive, loading, error } = useShop();
  const plan = resolveShopPlan(company?.plan);
  const canSeeClasses = canUsePlanFeature(plan, "GROUP_CLASSES");

  const [classLoading, setClassLoading] = React.useState(true);
  const [groupClass, setGroupClass] = React.useState<PublicGroupClass | null>(null);
  const [sessions, setSessions] = React.useState<PublicGroupClassSession[]>([]);
  const [myEnrollments, setMyEnrollments] = React.useState<PublicGroupClassEnrollment[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = React.useState<GroupPaymentMethod>("CASH");
  const [qrProofFile, setQrProofFile] = React.useState<File | null>(null);
  const [busyEnroll, setBusyEnroll] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: NoticeTone; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    if (!company?.id || !Number.isInteger(classId) || classId <= 0 || !canSeeClasses) {
      setGroupClass(null);
      setSessions([]);
      setMyEnrollments([]);
      setClassLoading(false);
      return;
    }

    setClassLoading(true);
    try {
      const [classData, sessionsData] = await Promise.all([
        getPublicClassById(company.id, classId),
        listPublicClassSessions(company.id, classId),
      ]);

      setGroupClass(classData);
      setSessions(sessionsData);

      if (classData.pricing_mode === "PER_SESSION") {
        const firstSelectable = sessionsData.find((session) => {
          if (session.cancelled_at) return false;
          const maxCapacity = getSessionMaxCapacity(session, classData.max_capacity_per_session);
          const booked = session.booked_count ?? 0;
          return new Date(session.start_at).getTime() >= Date.now() && booked < maxCapacity;
        });
        setSelectedSessionId(firstSelectable?.id ?? null);
      } else {
        setSelectedSessionId(null);
      }

      if (user?.id) {
        const mine = await getMyPublicGroupEnrollments();
        setMyEnrollments(mine.filter((row) => row.group_class_id === classId));
      } else {
        setMyEnrollments([]);
      }
    } catch (err) {
      setGroupClass(null);
      setSessions([]);
      setMyEnrollments([]);
      await notify.error(err instanceof Error ? err.message : t("shopGroup.classes.loadError"));
    } finally {
      setClassLoading(false);
    }
  }, [canSeeClasses, classId, company?.id, t, user?.id]);

  React.useEffect(() => {
    const allowCash = settings?.allow_cash_payment ?? true;
    const allowQr = settings?.allow_qr_payment ?? true;
    if (allowCash) {
      setPaymentMethod("CASH");
      return;
    }
    if (allowQr) {
      setPaymentMethod("QR");
      return;
    }
    setPaymentMethod("NONE");
  }, [settings?.allow_cash_payment, settings?.allow_qr_payment]);

  React.useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, loadData]);

  const staff = React.useMemo(
    () => getVisibleStaffAssignments(groupClass?.staff_assignments),
    [groupClass?.staff_assignments],
  );

  const activeEnrollment = React.useMemo(() => {
    const now = Date.now();
    return [...myEnrollments]
      .filter((enrollment) => {
        if (enrollment.status !== "CONFIRMED" && enrollment.status !== "PENDING") return false;
        return new Date(enrollment.valid_until).getTime() >= now;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
  }, [myEnrollments]);

  const upcomingSessions = React.useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((session) => !session.cancelled_at && new Date(session.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [sessions]);

  const selectedSession = React.useMemo(
    () => upcomingSessions.find((session) => session.id === selectedSessionId) ?? null,
    [upcomingSessions, selectedSessionId],
  );

  const selectedSessionSoldOut = React.useMemo(() => {
    if (!selectedSession || !groupClass) return false;
    const maxCapacity = getSessionMaxCapacity(selectedSession, groupClass.max_capacity_per_session);
    const booked = selectedSession.booked_count ?? 0;
    return booked >= maxCapacity;
  }, [groupClass, selectedSession]);

  const requireSignIn = React.useCallback(() => {
    if (user?.id) return true;
    router.push(buildSignInRedirectFromCurrentLocation(`/shop/${slug}/classes/${classId}`));
    return false;
  }, [classId, router, slug, user?.id]);

  const handleEnroll = async () => {
    if (!groupClass || !company) return;
    if (!requireSignIn()) return;

    if (groupClass.pricing_mode === "PER_SESSION") {
      if (!selectedSessionId) {
        await notify.warning(t("shopGroup.classes.selectSessionRequired"));
        return;
      }
      if (selectedSessionSoldOut) {
        await notify.warning(t("shopGroup.classes.selectedSessionSoldOut"));
        return;
      }
    }

    let uploadedQrUrl: string | undefined;
    setBusyEnroll(true);
    setNotice(null);

    try {
      if (groupClass.price_cents > 0 && paymentMethod === "QR" && qrProofFile) {
        uploadedQrUrl = await uploadGroupQrProof(qrProofFile, company.id);
      }

      const enrollment = await createPublicClassEnrollment({
        company_id: company.id,
        group_class_id: groupClass.id,
        group_class_session_id: groupClass.pricing_mode === "PER_SESSION" ? selectedSessionId ?? undefined : undefined,
        payment_method: groupClass.price_cents === 0 ? "NONE" : paymentMethod,
        qr_proof_image_url: uploadedQrUrl || null,
      });

      setNotice({
        tone: enrollment.status === "CONFIRMED" ? "success" : "warning",
        text:
          enrollment.status === "CONFIRMED"
            ? t("shopGroup.classes.enrollmentConfirmed")
            : t("shopGroup.classes.enrollmentPending"),
      });
      setQrProofFile(null);
      await loadData();
    } catch (err) {
      if (uploadedQrUrl) {
        await deleteGroupQrProof(uploadedQrUrl);
      }
      const message = err instanceof Error ? err.message : t("shopGroup.classes.enrollError");
      setNotice({ tone: "error", text: message });
      await notify.error(message);
    } finally {
      setBusyEnroll(false);
    }
  };

  if (loading || authLoading || classLoading) {
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
        <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
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

  if (!groupClass || !Number.isInteger(classId) || classId <= 0) {
    return (
      <main className="min-h-screen bg-page text-text-main">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
          <h1 className="text-3xl font-bold text-text-main">{t("shopGroup.classes.notFoundTitle")}</h1>
          <p className="mt-3 text-sm text-text-muted">{t("shopGroup.classes.notFoundDescription")}</p>
          <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}/classes`}>{t("shopGroup.actions.backToClasses")}</Link>
          </Button>
        </section>
        <ShopFooter />
      </main>
    );
  }

  const image = getGroupItemImage(groupClass);
  const locationQuery = groupClass.location_text?.trim()
    || company.address?.trim()
    || [company.city, company.state].map((value) => value?.trim() || "").filter((value) => value.length > 0).join(", ");
  const showPaymentForm = groupClass.price_cents > 0 && !activeEnrollment;
  const autoConfirmBookings = settings?.auto_confirm_bookings ?? true;
  const noUpcomingSessions = !hasUpcomingSession(sessions);

  return (
    <main className="min-h-screen bg-page text-text-main">
      <section className="border-b border-surface-border bg-surface py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 md:px-8">
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/shop/${slug}/classes`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("shopGroup.actions.backToClasses")}
            </Link>
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{t("shopGroup.classes.eyebrow")}</p>
          <h1 className="font-heading text-3xl font-bold text-text-main md:text-4xl">{groupClass.title}</h1>
          <p className="text-sm text-text-muted">{t("shopGroup.classes.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <article className="space-y-4 rounded-xl border border-surface-border bg-surface p-4 shadow-card">
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-section">
            {image ? (
              <img src={getImageUrl(image) || undefined} alt={groupClass.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">{t("shopGroup.media.noCover")}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t(`shopGroup.pricing.${groupClass.pricing_mode}`)}</Badge>
            <Badge variant="outline">
              {groupClass.price_cents === 0
                ? t("shopGroup.labels.free")
                : formatGroupMoney(groupClass.price_cents, company.currency)}
            </Badge>
          </div>

          {groupClass.description ? (
            <div
              className="text-sm text-text-muted [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
              // Description HTML is sanitized server-side before persistence.
              dangerouslySetInnerHTML={{ __html: groupClass.description }}
            />
          ) : null}

          <div className="grid gap-2 text-sm text-text-muted">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {getRecurrenceSummary(groupClass.recurrence_type, groupClass.recurrence_config, t)}
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("shopGroup.classes.activeRange", {
                start: formatGroupDate(groupClass.recurrence_start_date),
                end: formatGroupDate(groupClass.recurrence_end_date),
              })}
            </p>
            {locationQuery ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {locationQuery}
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("shopGroup.classes.capacityPerSession", { value: groupClass.max_capacity_per_session })}
            </p>
          </div>

          {staff.length > 0 ? (
            <div className="space-y-2 rounded-md border border-surface-border bg-section p-3">
              <h3 className="text-sm font-semibold text-text-main">{t("shopGroup.fields.staff")}</h3>
              <ul className="space-y-1 text-sm text-text-muted">
                {staff.map((assignment) => (
                  <li key={assignment.id}>
                    <span className="font-medium text-text-main">{getStaffDisplayName(assignment)}</span>
                    {getStaffDisplayPhone(assignment) ? ` · ${getStaffDisplayPhone(assignment)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {locationQuery ? (
            <div className="space-y-2 rounded-md border border-surface-border bg-section p-3">
              <h3 className="text-sm font-semibold text-text-main">{t("shopGroup.fields.location")}</h3>
              <MapboxLocationPreview
                query={locationQuery}
                defaultLatitude={company.latitude ?? null}
                defaultLongitude={company.longitude ?? null}
                className="h-56"
                fallbackText={t("shopLocation.mapNotAvailable")}
              />
            </div>
          ) : null}

          <div className="space-y-2 rounded-md border border-surface-border bg-section p-3">
            <h3 className="text-sm font-semibold text-text-main">{t("shopGroup.classes.scheduleTitle")}</h3>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-text-muted">{t("shopGroup.classes.noUpcomingSessions")}</p>
            ) : (
              <ul className="space-y-2 text-sm text-text-muted">
                {upcomingSessions.slice(0, 10).map((session) => {
                  const maxCapacity = getSessionMaxCapacity(session, groupClass.max_capacity_per_session);
                  const booked = session.booked_count ?? 0;
                  const soldOut = booked >= maxCapacity;

                  return (
                    <li key={session.id} className="rounded-md border border-surface-border bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-text-main">{formatGroupDateTime(session.start_at)}</span>
                        <span className="text-xs">
                          {t("shopGroup.events.capacity", { booked, total: maxCapacity })}
                        </span>
                      </div>
                      {soldOut ? (
                        <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          {t("shopGroup.labels.soldOut")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="space-y-4 rounded-xl border border-surface-border bg-surface p-4 shadow-card">
            <h2 className="text-xl font-semibold text-text-main">
              {groupClass.price_cents === 0
                ? t("shopGroup.classes.enrollFree")
                : t("shopGroup.classes.enrollPaid", { price: formatGroupMoney(groupClass.price_cents, company.currency) })}
            </h2>

            <p className="text-sm text-text-muted">
              {autoConfirmBookings
                ? t("shopGroup.events.autoConfirmOn")
                : t("shopGroup.events.autoConfirmOff")}
            </p>

            {notice ? (
              <p
                className={
                  notice.tone === "success"
                    ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                    : notice.tone === "warning"
                      ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                      : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                }
              >
                {notice.text}
              </p>
            ) : null}

            {!user?.id ? (
              <Button
                className="w-full bg-brand text-white hover:bg-brand-hover"
                onClick={() => router.push(buildSignInRedirectFromCurrentLocation(`/shop/${slug}/classes/${groupClass.id}`))}
              >
                {t("shopGroup.actions.signInToContinue")}
              </Button>
            ) : activeEnrollment ? (
              <div className="space-y-3">
                <Badge variant="outline">{t(`shopGroup.status.${activeEnrollment.status}`)}</Badge>
                <p className="text-sm text-text-muted">
                  {activeEnrollment.status === "CONFIRMED"
                    ? t("shopGroup.classes.alreadyConfirmed")
                    : t("shopGroup.classes.alreadyPending")}
                </p>
                <p className="text-xs text-text-muted">
                  {t("shopGroup.fields.validity")}: {formatGroupDate(activeEnrollment.valid_from)} - {formatGroupDate(activeEnrollment.valid_until)}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href={appendShopParam("/me/group-reservations", slug)}>
                    {t("shopGroup.actions.viewMyGroupReservations")}
                  </Link>
                </Button>
              </div>
            ) : noUpcomingSessions ? (
              <p className="text-sm text-text-muted">{t("shopGroup.classes.noUpcomingForEnrollment")}</p>
            ) : (
              <div className="space-y-3">
                {groupClass.pricing_mode === "PER_SESSION" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted">{t("shopGroup.classes.selectSession")}</label>
                    <select
                      className="h-10 w-full rounded-md border border-surface-border bg-white px-3 text-sm text-text-main"
                      value={selectedSessionId ?? ""}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        setSelectedSessionId(Number.isInteger(value) ? value : null);
                      }}
                    >
                      <option value="">{t("shopGroup.classes.selectSessionPlaceholder")}</option>
                      {upcomingSessions.map((session) => {
                        const maxCapacity = getSessionMaxCapacity(session, groupClass.max_capacity_per_session);
                        const booked = session.booked_count ?? 0;
                        const soldOut = booked >= maxCapacity;

                        return (
                          <option key={session.id} value={session.id} disabled={soldOut}>
                            {formatGroupDateTime(session.start_at)} · {soldOut ? t("shopGroup.labels.soldOut") : t("shopGroup.events.capacity", { booked, total: maxCapacity })}
                          </option>
                        );
                      })}
                    </select>
                    {selectedSessionSoldOut ? (
                      <p className="text-xs text-rose-700">{t("shopGroup.classes.selectedSessionSoldOut")}</p>
                    ) : null}
                  </div>
                ) : null}

                {showPaymentForm ? (
                  <GroupPaymentMethodForm
                    settings={settings}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    qrProofFile={qrProofFile}
                    onQrProofChange={setQrProofFile}
                    t={t}
                  />
                ) : null}

                <Button
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  onClick={() => void handleEnroll()}
                  disabled={busyEnroll || (groupClass.pricing_mode === "PER_SESSION" && !selectedSessionId)}
                >
                  {busyEnroll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {groupClass.price_cents === 0
                    ? t("shopGroup.actions.confirmEnrollment")
                    : t("shopGroup.actions.completeEnrollment")}
                </Button>
              </div>
            )}
          </article>
        </aside>
      </section>

      <ShopFooter />
    </main>
  );
}
