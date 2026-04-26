"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Loader2, MapPin, MessageCircle, Upload } from "lucide-react";
import { ShareButton } from "@/components/shop/ShareButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapboxLocationPreview } from "@/components/maps/MapboxLocationPreview";
import { useI18n } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useAuth } from "@/lib/useAuth";
import { InstallmentPlanCard } from "@/app/shop/components/group/InstallmentPlanCard";
import { useShop } from "../../../contexts/ShopContext";
import { ShopUnavailableState } from "../../../components/ShopUnavailableState";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { canUsePlanFeature } from "@/lib/plans/capabilities";
import { appendShopParam } from "@/app/lib/shop-context";
import {
  createPublicClassEnrollment,
  capturePublicClassInterest,
  deleteGroupQrProof,
  getMyGroupPaymentPlans,
  getMyPublicGroupEnrollments,
  getPublicClassById,
  listPublicClassSessions,
  startClassGuestEnrollment,
  verifyClassGuestEnrollment,
  type GroupEnrollmentInstallmentPlan,
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
import { getImageUrl } from "@/utils/image-url";
import { QrProofPreview } from "@/app/shop/components/QrProofPreview";

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
  const { t, locale } = useI18n();
  const params = useParams<{ classId: string }>();
  const classId = Number.parseInt(params?.classId || "", 10);

  const { user, loading: authLoading, refreshSession } = useAuth();
  const { company, settings, slug, isShopActive, loading, error } = useShop();
  const canSeeClasses = canUsePlanFeature(company, "GROUP_CLASSES");

  const [classLoading, setClassLoading] = React.useState(true);
  const [groupClass, setGroupClass] = React.useState<PublicGroupClass | null>(null);
  const [sessions, setSessions] = React.useState<PublicGroupClassSession[]>([]);
  const [myEnrollments, setMyEnrollments] = React.useState<PublicGroupClassEnrollment[]>([]);
  const [paymentPlans, setPaymentPlans] = React.useState<GroupEnrollmentInstallmentPlan[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState<number | null>(null);

  const [qrProofFile, setQrProofFile] = React.useState<File | null>(null);
  const [busyEnroll, setBusyEnroll] = React.useState(false);
  const [registrationOpen, setRegistrationOpen] = React.useState(false);
  const [registrationStep, setRegistrationStep] = React.useState<"contact" | "code" | "thanks" | "online" | "submitted">("contact");
  const [guestFullName, setGuestFullName] = React.useState("");
  const [guestEmail, setGuestEmail] = React.useState("");
  const [guestPhonePrefix, setGuestPhonePrefix] = React.useState("591");
  const [guestPhoneNumber, setGuestPhoneNumber] = React.useState("");
  const [guestCode, setGuestCode] = React.useState("");
  const [guestSessionId, setGuestSessionId] = React.useState<string | null>(null);
  const [guestBusy, setGuestBusy] = React.useState<"start" | "verify" | "interest" | null>(null);
  const [guestError, setGuestError] = React.useState<string | null>(null);

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
        const [mine, myPaymentPlans] = await Promise.all([
          getMyPublicGroupEnrollments(),
          getMyGroupPaymentPlans(),
        ]);
        setMyEnrollments(mine.filter((row) => row.group_class_id === classId));
        setPaymentPlans(myPaymentPlans.filter((plan) => plan.enrollment.group_class_id === classId));
      } else {
        setMyEnrollments([]);
        setPaymentPlans([]);
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

  const activePaymentPlan = React.useMemo(() => {
    if (!activeEnrollment) return null;
    return paymentPlans.find((plan) => plan.enrollment.id === activeEnrollment.id) ?? null;
  }, [activeEnrollment, paymentPlans]);

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

  const whatsappUrl = React.useMemo(() => {
    if (!company?.phone?.trim() || !groupClass) return null;
    const shopPhone = `${(company.phone_prefix ?? "").replace(/\D/g, "")}${company.phone.replace(/\D/g, "")}`;
    if (!shopPhone) return null;
    const customerName = user?.name || guestFullName || "Cliente";
    const customerEmail = user?.email || guestEmail;
    const customerPhone = user?.phoneNumber || guestPhoneNumber;
    const message = [
      `Hola ${company.name}, quiero confirmar mi reserva para el curso ${groupClass.title}.`,
      `Nombre: ${customerName}`,
      customerEmail ? `Email: ${customerEmail}` : null,
      customerPhone ? `Celular: +${user?.phone_prefix || guestPhonePrefix || ""}${customerPhone}` : null,
    ].filter(Boolean).join("\n");
    return `https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}`;
  }, [company, groupClass, guestEmail, guestFullName, guestPhoneNumber, guestPhonePrefix, user]);

  const openRegistrationFlow = async () => {
    if (!groupClass || !company) return;
    setGuestError(null);
    setRegistrationOpen(true);

    if (user?.id) {
      setRegistrationStep("thanks");
      setGuestBusy("interest");
      try {
        await capturePublicClassInterest(company.id, groupClass.id);
      } catch {
        // Non-blocking: the user can still confirm by WhatsApp or QR.
      } finally {
        setGuestBusy(null);
      }
      return;
    }

    setRegistrationStep("contact");
  };

  const handleStartGuestRegistration = async () => {
    if (!groupClass || !company) return;
    const fullName = guestFullName.trim();
    const email = guestEmail.trim().toLowerCase();
    const phonePrefix = guestPhonePrefix.replace(/\D/g, "");
    const phoneNumber = guestPhoneNumber.replace(/\D/g, "");

    if (!fullName || !email || !phonePrefix || !phoneNumber) {
      setGuestError("Completa tu nombre, email y celular.");
      return;
    }

    setGuestBusy("start");
    setGuestError(null);
    try {
      const result = await startClassGuestEnrollment(groupClass.id, {
        company_id: company.id,
        full_name: fullName,
        email,
        phonePrefix,
        phoneNumber,
      });
      if (result.accountOutcome === "ACCOUNT_CONFLICT_PHONE_EMAIL") {
        setGuestError("El correo y el celular pertenecen a cuentas distintas. Inicia sesión manualmente para continuar.");
        return;
      }
      if (!result.checkout_session_id || !result.canVerify) {
        setGuestError("No pudimos enviar el código. Inténtalo nuevamente.");
        return;
      }
      setGuestSessionId(result.checkout_session_id);
      setGuestPhonePrefix(phonePrefix);
      setGuestPhoneNumber(phoneNumber);
      setRegistrationStep("code");
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : "No se pudo enviar el código.");
    } finally {
      setGuestBusy(null);
    }
  };

  const handleVerifyGuestRegistration = async () => {
    if (!groupClass || !company || !guestSessionId) return;
    if (!guestCode.trim()) {
      setGuestError("Ingresa el código de verificación.");
      return;
    }

    setGuestBusy("verify");
    setGuestError(null);
    try {
      await verifyClassGuestEnrollment(groupClass.id, {
        company_id: company.id,
        checkout_session_id: guestSessionId,
        code: guestCode.trim(),
      });
      await refreshSession();
      await loadData();
      setRegistrationStep("thanks");
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : "No se pudo verificar el código.");
    } finally {
      setGuestBusy(null);
    }
  };

  const handleOnlineReservation = async () => {
    if (!groupClass || !company) return;
    if (!user?.id && !(await refreshSession())?.id) {
      setGuestError("Verifica tu código antes de reservar en línea.");
      return;
    }
    if (groupClass.pricing_mode === "PER_SESSION") {
      if (!selectedSessionId) {
        setGuestError(t("shopGroup.classes.selectSessionRequired"));
        return;
      }
      if (selectedSessionSoldOut) {
        setGuestError(t("shopGroup.classes.selectedSessionSoldOut"));
        return;
      }
    }
    if ((settings?.require_comprobante_for_qr ?? true) && !qrProofFile) {
      setGuestError(t("shopGroup.payment.uploadProofRequired"));
      return;
    }

    let uploadedQrUrl: string | undefined;
    setBusyEnroll(true);
    setGuestError(null);
    try {
      if (qrProofFile) {
        uploadedQrUrl = await uploadGroupQrProof(qrProofFile, company.id);
      }
      await createPublicClassEnrollment({
        company_id: company.id,
        group_class_id: groupClass.id,
        group_class_session_id: groupClass.pricing_mode === "PER_SESSION" ? selectedSessionId ?? undefined : undefined,
        payment_method: "QR",
        qr_proof_image_url: uploadedQrUrl || null,
      });
      setQrProofFile(null);
      await loadData();
      setRegistrationStep("submitted");
    } catch (err) {
      if (uploadedQrUrl) await deleteGroupQrProof(uploadedQrUrl);
      setGuestError(err instanceof Error ? err.message : t("shopGroup.classes.enrollError"));
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
  const autoConfirmBookings = settings?.auto_confirm_bookings ?? true;
  const noUpcomingSessions = !hasUpcomingSession(sessions);

  return (
    <main className="min-h-screen bg-page text-text-main">
      <section className="border-b border-surface-border bg-surface py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 md:px-8">
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" className="w-fit">
              <Link href={`/shop/${slug}/classes`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("shopGroup.actions.backToClasses")}
              </Link>
            </Button>
            <ShareButton title={groupClass.title} text={groupClass.description ?? undefined} size="sm" />
          </div>
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
            {groupClass.price_cents > 0 && (
              <Badge variant="outline">{formatGroupMoney(groupClass.price_cents, company.currency)}</Badge>
            )}
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
                start: formatGroupDate(groupClass.recurrence_start_date, locale),
                end: formatGroupDate(groupClass.recurrence_end_date, locale),
              })}
            </p>
            {locationQuery ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {locationQuery}
              </p>
            ) : null}
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
                {upcomingSessions.slice(0, 10).map((session) => (
                  <li key={session.id} className="rounded-md border border-surface-border bg-white px-3 py-2">
                    <span className="text-text-main">{formatGroupDateTime(session.start_at, locale)}</span>
                  </li>
                ))}
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

            {!user?.id ? (
              <Button
                className="w-full bg-brand text-white hover:bg-brand-hover"
                onClick={() => void openRegistrationFlow()}
              >
                Regístrate aquí
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
                  {t("shopGroup.fields.validity")}: {formatGroupDate(activeEnrollment.valid_from, locale)} - {formatGroupDate(activeEnrollment.valid_until, locale)}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href={appendShopParam("/me/group-reservations", slug)}>
                    {t("shopGroup.actions.viewMyGroupReservations")}
                  </Link>
                </Button>
                {activePaymentPlan ? (
                  <InstallmentPlanCard
                    plan={activePaymentPlan}
                    companyId={company.id}
                    locale={locale}
                    t={t}
                    onRefresh={loadData}
                  />
                ) : null}
              </div>
            ) : noUpcomingSessions ? (
              <p className="text-sm text-text-muted">{t("shopGroup.classes.noUpcomingForEnrollment")}</p>
            ) : (
              <Button
                className="w-full bg-brand text-white hover:bg-brand-hover"
                onClick={() => void openRegistrationFlow()}
              >
                Inscribirme
              </Button>
            )}
          </article>
        </aside>
      </section>

      <Dialog open={registrationOpen} onOpenChange={setRegistrationOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>
              {registrationStep === "submitted" ? "Tu reserva será confirmada" : "Regístrate aquí"}
            </DialogTitle>
            <DialogDescription>
              {registrationStep === "thanks" || registrationStep === "online"
                ? "Gracias! Has hecho tu reserva, por favor confirma en línea o por WhatsApp"
                : registrationStep === "submitted"
                  ? "Tu reserva será confirmada, gracias."
                  : "Ingresa tus datos para recibir un código de verificación."}
            </DialogDescription>
          </DialogHeader>

          {guestError ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{guestError}</p>
          ) : null}

          {registrationStep === "contact" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={guestFullName} onChange={(event) => setGuestFullName(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} />
              </div>
              <div className="grid grid-cols-[88px_1fr] gap-2">
                <div className="space-y-1">
                  <Label>Prefijo</Label>
                  <Input value={guestPhonePrefix} onChange={(event) => setGuestPhonePrefix(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Celular</Label>
                  <Input value={guestPhoneNumber} onChange={(event) => setGuestPhoneNumber(event.target.value)} />
                </div>
              </div>
              <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => void handleStartGuestRegistration()} disabled={guestBusy === "start"}>
                {guestBusy === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar código
              </Button>
            </div>
          ) : null}

          {registrationStep === "code" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input value={guestCode} onChange={(event) => setGuestCode(event.target.value)} inputMode="numeric" />
              </div>
              <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => void handleVerifyGuestRegistration()} disabled={guestBusy === "verify"}>
                {guestBusy === "verify" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar código
              </Button>
            </div>
          ) : null}

          {registrationStep === "thanks" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {whatsappUrl ? (
                <Button asChild variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button className="bg-brand text-white hover:bg-brand-hover" onClick={() => setRegistrationStep("online")}>
                Reservar en línea
              </Button>
            </div>
          ) : null}

          {registrationStep === "online" ? (
            <div className="space-y-3">
              {groupClass.pricing_mode === "PER_SESSION" ? (
                <div className="space-y-1">
                  <Label>{t("shopGroup.classes.selectSession")}</Label>
                  <select
                    className="h-10 w-full rounded-md border border-surface-border bg-white px-3 text-sm text-text-main"
                    value={selectedSessionId ?? ""}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      setSelectedSessionId(Number.isInteger(value) ? value : null);
                    }}
                  >
                    <option value="">{t("shopGroup.classes.selectSessionPlaceholder")}</option>
                    {upcomingSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {formatGroupDateTime(session.start_at, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-3 rounded-md border border-surface-border bg-section p-3">
                {settings?.qr_image_url ? (
                  <div className="rounded-md border border-surface-border bg-white p-3">
                    <img
                      src={getImageUrl(settings.qr_image_url) || undefined}
                      alt={t("shopGroup.payment.qrCode")}
                      className="mx-auto h-44 w-44 object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">{t("shopGroup.payment.qrMissing")}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.getElementById("class-online-qr-proof-upload")?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {qrProofFile ? t("shopGroup.payment.changeProof") : t("shopGroup.payment.uploadProof")}
                </Button>
                <input
                  id="class-online-qr-proof-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setQrProofFile(event.target.files?.[0] || null)}
                />
                {qrProofFile ? (
                  <QrProofPreview
                    file={qrProofFile}
                    alt={t("shopGroup.payment.uploadProof")}
                    removeLabel={t("shopGroup.payment.removeProof")}
                    onRemove={() => setQrProofFile(null)}
                  />
                ) : null}
              </div>

              <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => void handleOnlineReservation()} disabled={busyEnroll}>
                {busyEnroll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar comprobante
              </Button>
            </div>
          ) : null}

          {registrationStep === "submitted" ? (
            <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => setRegistrationOpen(false)}>
              Cerrar
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <ShopFooter />
    </main>
  );
}
