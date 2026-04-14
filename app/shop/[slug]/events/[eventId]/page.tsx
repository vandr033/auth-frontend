"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { ShareButton } from "@/components/shop/ShareButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapboxLocationPreview } from "@/components/maps/MapboxLocationPreview";
import { useI18n } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useAuth } from "@/lib/useAuth";
import { useOtpResendTimer } from "@/lib/auth/otpResend";
import { useShop } from "../../../contexts/ShopContext";
import { ShopUnavailableState } from "../../../components/ShopUnavailableState";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { appendShopParam, buildSignInRedirectFromCurrentLocation, buildSignInRedirectPath } from "@/app/lib/shop-context";
import {
  capturePublicEventInterest,
  createPublicEventBooking,
  deleteGroupQrProof,
  getMyPublicGroupBookings,
  getPublicEventById,
  getFreeRegistrationState,
  joinPublicEventWaitlist,
  leavePublicEventWaitlist,
  type GroupPaymentMethod,
  type PublicGroupEvent,
  type PublicGroupEventBooking,
  type FreeRegistrationStateData,
  type FreeRegistrationResult,
  uploadGroupQrProof,
} from "@/app/shop/lib/groupReservationsApi";
import { FreeEventRegistrationForm } from "@/app/shop/components/group/FreeEventRegistrationForm";
import {
  formatGroupDateRange,
  formatGroupMoney,
  getGroupItemImage,
  getStaffDisplayName,
  getStaffDisplayPhone,
  getVisibleStaffAssignments,
  isEventSoldOut,
} from "@/app/shop/lib/groupReservationsFormat";
import { GroupPaymentMethodForm } from "@/app/shop/components/group/GroupPaymentMethodForm";
import { getImageUrl } from "@/utils/image-url";

type NoticeTone = "success" | "warning" | "error";
type ExtraAttendeeForm = {
  full_name: string;
  email: string;
  phone: string;
};

export default function ShopEventDetailPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ eventId: string }>();
  const eventId = Number.parseInt(params?.eventId || "", 10);
  const {
    user,
    loading: authLoading,
    sendLoginEmailOtp,
    verifyLoginEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();
  const { company, settings, slug, isShopActive, loading, error, modules } = useShop();
  const plan = resolveShopPlan(company?.plan);
  const canSeeEvents = modules.reservations && canUsePlanFeature(plan, "GROUP_EVENTS");
  const canUseAdvanced = canUsePlanFeature(plan, "GROUP_ADVANCED");

  const [eventLoading, setEventLoading] = React.useState(true);
  const [event, setEvent] = React.useState<PublicGroupEvent | null>(null);
  const [myBookings, setMyBookings] = React.useState<PublicGroupEventBooking[]>([]);
  const [bookedSpots, setBookedSpots] = React.useState("1");
  const [notes, setNotes] = React.useState("");
  const [extraAttendees, setExtraAttendees] = React.useState<ExtraAttendeeForm[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<GroupPaymentMethod>("CASH");
  const [qrProofFile, setQrProofFile] = React.useState<File | null>(null);
  const [busyAction, setBusyAction] = React.useState<"book" | "waitlist" | "interest" | "leave_waitlist" | null>(null);
  const [notice, setNotice] = React.useState<{ tone: NoticeTone; text: string } | null>(null);
  const [freeRegState, setFreeRegState] = React.useState<FreeRegistrationStateData | null>(null);
  const [isFreeRegModalOpen, setIsFreeRegModalOpen] = React.useState(false);
  const [isFreeOutcomeModalOpen, setIsFreeOutcomeModalOpen] = React.useState(false);
  const [freeSubmitResult, setFreeSubmitResult] = React.useState<FreeRegistrationResult | null>(null);
  const [freeSubmitContact, setFreeSubmitContact] = React.useState<{
    email: string;
    phonePrefix: string;
    phoneNumber: string;
  } | null>(null);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpChannel, setOtpChannel] = React.useState<"email" | "phone" | null>(null);
  const [otpBusy, setOtpBusy] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = React.useState<string | null>(null);
  const { secondsRemaining, canResend, startCooldown, resetCooldown } = useOtpResendTimer();
  const autoInterestHandledRef = React.useRef(false);

  const loadData = React.useCallback(async () => {
    if (!company?.id || !Number.isInteger(eventId) || eventId <= 0 || !canSeeEvents) {
      setEvent(null);
      setMyBookings([]);
      setEventLoading(false);
      return;
    }

    setEventLoading(true);
    try {
      const eventData = await getPublicEventById(company.id, eventId);
      setEvent(eventData);

      if (eventData.is_free && company?.id) {
        try {
          const regState = await getFreeRegistrationState(company.id, eventId);
          setFreeRegState(regState);
        } catch {
          // non-fatal
        }
      }

      if (user?.id) {
        const mine = await getMyPublicGroupBookings();
        setMyBookings(mine.filter((row) => row.group_event_id === eventId));
      } else {
        setMyBookings([]);
      }
    } catch (err) {
      setEvent(null);
      setMyBookings([]);
      await notify.error(err instanceof Error ? err.message : t("shopGroup.events.loadError"));
    } finally {
      setEventLoading(false);
    }
  }, [canSeeEvents, company?.id, eventId, t, user?.id]);

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

  React.useEffect(() => {
    const parsedSpots = Number.parseInt(bookedSpots, 10);
    const maxSpots = event?.max_capacity ?? 1;
    const clampedSpots = Number.isInteger(parsedSpots) && parsedSpots > 0
      ? Math.min(parsedSpots, Math.max(1, maxSpots))
      : 1;
    const needed = Math.max(0, clampedSpots - 1);

    setExtraAttendees((prev) => {
      if (prev.length === needed) return prev;
      if (prev.length > needed) return prev.slice(0, needed);
      return [
        ...prev,
        ...Array.from({ length: needed - prev.length }, () => ({
          full_name: "",
          email: "",
          phone: "",
        })),
      ];
    });
  }, [bookedSpots, event?.max_capacity]);

  const staff = React.useMemo(
    () => getVisibleStaffAssignments(event?.staff_assignments),
    [event?.staff_assignments],
  );

  const soldOut = React.useMemo(
    () => (event ? isEventSoldOut(event) : false),
    [event],
  );

  const activeBooking = React.useMemo(() => {
    const activeStatuses = new Set(["CONFIRMED", "PENDING", "WAITLISTED"]);
    return [...myBookings]
      .filter((booking) => activeStatuses.has(booking.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
  }, [myBookings]);

  const interestIntent = React.useMemo(
    () => searchParams?.get("interest_intent") === "1",
    [searchParams],
  );

  const clearInterestIntentFromUrl = React.useCallback(() => {
    if (!interestIntent) return;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("interest_intent");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : (pathname ?? "/"), { scroll: false });
  }, [interestIntent, pathname, router, searchParams]);

  const buildOtpPhoneTarget = React.useCallback((contact: { phonePrefix: string; phoneNumber: string } | null) => {
    if (!contact) return "";
    const prefixDigits = contact.phonePrefix.replace(/\D/g, "");
    const localDigits = contact.phoneNumber.replace(/\D/g, "");
    if (!localDigits) return "";
    if (prefixDigits && localDigits.startsWith(prefixDigits)) return `+${localDigits}`;
    if (prefixDigits) return `+${prefixDigits}${localDigits}`;
    return `+${localDigits}`;
  }, []);

  const otpSection = freeSubmitResult?.otpSection;
  const otpAvailableChannels = React.useMemo(() => {
    if (!otpSection?.show) return [] as Array<"email" | "phone">;
    if (otpSection.availableChannels && otpSection.availableChannels.length > 0) return otpSection.availableChannels;
    return otpSection.primaryChannel ? [otpSection.primaryChannel] : [];
  }, [otpSection]);

  React.useEffect(() => {
    if (!isFreeOutcomeModalOpen || !freeSubmitResult) return;
    setOtpCode("");
    setOtpError(null);
    setOtpSuccess(null);
    setOtpChannel(otpAvailableChannels[0] ?? freeSubmitResult.otpSection?.primaryChannel ?? null);
    resetCooldown();
    if (freeSubmitResult.otpSection?.show) {
      startCooldown();
    }
  }, [freeSubmitResult, isFreeOutcomeModalOpen, otpAvailableChannels, resetCooldown, startCooldown]);

  const handleOtpResend = React.useCallback(async () => {
    if (!freeSubmitResult?.otpSection?.show || !freeSubmitContact || !otpChannel) return;
    if (!canResend || otpBusy) return;

    setOtpBusy(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      if (otpChannel === "email") {
        await sendLoginEmailOtp(freeSubmitContact.email);
      } else {
        const phoneTarget = buildOtpPhoneTarget(freeSubmitContact);
        if (!phoneTarget) {
          throw new Error(t("freeEventReg.account.sendOtpError"));
        }
        await sendPhoneOtp(phoneTarget);
      }
      startCooldown();
      setOtpSuccess(t("freeEventReg.account.resendSuccess"));
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t("freeEventReg.account.sendOtpError"));
    } finally {
      setOtpBusy(false);
    }
  }, [
    buildOtpPhoneTarget,
    canResend,
    freeSubmitContact,
    freeSubmitResult?.otpSection?.show,
    otpBusy,
    otpChannel,
    sendLoginEmailOtp,
    sendPhoneOtp,
    startCooldown,
    t,
  ]);

  const handleOtpVerify = React.useCallback(async () => {
    if (!freeSubmitResult?.otpSection?.show || !freeSubmitContact || !otpChannel) return;
    if (!otpCode.trim()) {
      setOtpError(t("freeEventReg.account.otpRequired"));
      return;
    }

    setOtpBusy(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      if (otpChannel === "email") {
        await verifyLoginEmailOtp(freeSubmitContact.email, otpCode.trim());
      } else {
        const phoneTarget = buildOtpPhoneTarget(freeSubmitContact);
        if (!phoneTarget) {
          throw new Error(t("freeEventReg.account.verifyError"));
        }
        await verifyPhoneOtp(phoneTarget, otpCode.trim());
      }
      setOtpSuccess(t("freeEventReg.account.verifySuccess"));
      await loadData();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t("freeEventReg.account.verifyError"));
    } finally {
      setOtpBusy(false);
    }
  }, [
    buildOtpPhoneTarget,
    freeSubmitContact,
    freeSubmitResult?.otpSection?.show,
    loadData,
    otpChannel,
    otpCode,
    t,
    verifyLoginEmailOtp,
    verifyPhoneOtp,
  ]);

  const handleFreeRegSubmitted = React.useCallback((
    result: FreeRegistrationResult,
    contact: { email: string; phonePrefix: string; phoneNumber: string },
  ) => {
    setIsFreeRegModalOpen(false);
    setFreeSubmitResult(result);
    setFreeSubmitContact(contact);
    setIsFreeOutcomeModalOpen(true);
  }, []);

  const requireSignIn = React.useCallback(() => {
    if (user?.id) return true;
    router.push(buildSignInRedirectFromCurrentLocation(`/shop/${slug}/events/${eventId}`));
    return false;
  }, [eventId, router, slug, user?.id]);

  const handleSignInToContinue = React.useCallback(() => {
    if (soldOut) {
      router.push(buildSignInRedirectPath(`/shop/${slug}/events/${event?.id ?? eventId}?interest_intent=1`, slug));
      return;
    }

    router.push(buildSignInRedirectFromCurrentLocation(`/shop/${slug}/events/${event?.id ?? eventId}`));
  }, [event?.id, eventId, router, slug, soldOut]);

  const handleBook = async () => {
    if (!event || !company) return;
    if (!requireSignIn()) return;

    const rawSpots = Number.parseInt(bookedSpots, 10);
    if (!Number.isInteger(rawSpots) || rawSpots < 1) {
      await notify.warning(t("shopGroup.forms.invalidSpots"));
      return;
    }
    const spots = Math.min(rawSpots, Math.max(1, event.max_capacity));
    if (spots !== rawSpots) {
      setBookedSpots(String(spots));
    }

    const neededExtras = spots - 1;
    if (neededExtras > 0 && extraAttendees.length !== neededExtras) {
      setExtraAttendees((prev) => {
        if (prev.length > neededExtras) return prev.slice(0, neededExtras);
        return [
          ...prev,
          ...Array.from({ length: neededExtras - prev.length }, () => ({ full_name: "", email: "", phone: "" })),
        ];
      });
      return;
    }

    for (let index = 0; index < extraAttendees.length; index += 1) {
      const attendee = extraAttendees[index];
      if (!attendee.full_name.trim()) {
        await notify.warning(t("shopGroup.forms.missingExtraAttendeeName", { number: index + 2 }));
        return;
      }
      if (!attendee.email.trim() && !attendee.phone.trim()) {
        await notify.warning(t("shopGroup.forms.missingExtraAttendeeContact", { number: index + 2 }));
        return;
      }
    }

    let uploadedQrUrl: string | undefined;
    setBusyAction("book");
    setNotice(null);

    try {
      if (!event.is_free && paymentMethod === "QR" && qrProofFile) {
        uploadedQrUrl = await uploadGroupQrProof(qrProofFile, company.id);
      }

      const booking = await createPublicEventBooking({
        company_id: company.id,
        group_event_id: event.id,
        booked_spots: spots,
        payment_method: event.is_free ? "NONE" : paymentMethod,
        qr_proof_image_url: uploadedQrUrl || null,
        extra_attendees: extraAttendees.map((attendee) => ({
          full_name: attendee.full_name.trim(),
          email: attendee.email.trim() || null,
          phone: attendee.phone.trim() || null,
        })),
        notes: notes.trim() || null,
      });

      setNotice({
        tone: booking.status === "CONFIRMED" ? "success" : "warning",
        text:
          booking.status === "CONFIRMED"
            ? t("shopGroup.events.registrationConfirmed")
            : t("shopGroup.events.registrationPending"),
      });
      setQrProofFile(null);
      setNotes("");
      setBookedSpots("1");
      setExtraAttendees([]);
      await loadData();
    } catch (err) {
      if (uploadedQrUrl) {
        await deleteGroupQrProof(uploadedQrUrl);
      }
      const message = err instanceof Error ? err.message : t("shopGroup.events.bookError");
      setNotice({ tone: "error", text: message });
      await notify.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!event || !company) return;
    if (!requireSignIn()) return;
    setBusyAction("waitlist");
    setNotice(null);
    try {
      await joinPublicEventWaitlist(company.id, event.id);
      setNotice({ tone: "success", text: t("shopGroup.events.waitlistJoined") });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("shopGroup.events.waitlistJoinError");
      setNotice({ tone: "error", text: message });
      await notify.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!event || !company) return;
    if (!requireSignIn()) return;
    setBusyAction("leave_waitlist");
    setNotice(null);
    try {
      await leavePublicEventWaitlist(company.id, event.id);
      setNotice({ tone: "success", text: t("shopGroup.events.waitlistLeft") });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("shopGroup.events.waitlistLeaveError");
      setNotice({ tone: "error", text: message });
      await notify.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleInterest = async () => {
    if (!event || !company) return;
    if (!requireSignIn()) return;
    setBusyAction("interest");
    setNotice(null);
    try {
      const result = await capturePublicEventInterest(company.id, event.id);
      setNotice({
        tone: result.already_interested ? "warning" : "success",
        text: result.already_interested
          ? t("shopGroup.events.interestAlreadyCaptured")
          : t("shopGroup.events.interestCaptured"),
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("shopGroup.events.interestError");
      setNotice({ tone: "error", text: message });
      await notify.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  React.useEffect(() => {
    autoInterestHandledRef.current = false;
  }, [eventId]);

  React.useEffect(() => {
    if (!interestIntent || autoInterestHandledRef.current) return;
    if (authLoading || loading || eventLoading) return;
    if (!user?.id || !event || !company) return;

    autoInterestHandledRef.current = true;

    const run = async () => {
      if (!soldOut || activeBooking) {
        clearInterestIntentFromUrl();
        return;
      }

      setBusyAction("interest");
      setNotice(null);
      try {
        if (!event.is_free && canUseAdvanced) {
          await joinPublicEventWaitlist(company.id, event.id);
          setNotice({ tone: "success", text: t("shopGroup.events.waitlistJoined") });
        } else {
          const result = await capturePublicEventInterest(company.id, event.id);
          setNotice({
            tone: result.already_interested ? "warning" : "success",
            text: result.already_interested
              ? t("shopGroup.events.interestAlreadyCaptured")
              : t("shopGroup.events.interestCaptured"),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t("shopGroup.events.interestError");
        if (/no longer sold out|not full|already have an active booking/i.test(message)) {
          setNotice({ tone: "warning", text: message });
        } else {
          setNotice({ tone: "error", text: message });
          await notify.error(message);
        }
      } finally {
        setBusyAction(null);
        clearInterestIntentFromUrl();
        await loadData();
      }
    };

    void run();
  }, [
    activeBooking,
    authLoading,
    canUseAdvanced,
    clearInterestIntentFromUrl,
    company,
    event,
    eventLoading,
    interestIntent,
    loadData,
    loading,
    soldOut,
    t,
    user?.id,
  ]);

  if (loading || authLoading || eventLoading) {
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

  if (!canSeeEvents) {
    return (
      <main className="min-h-screen bg-page text-text-main">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
          <h1 className="text-3xl font-bold text-text-main">{t("shopGroup.events.title")}</h1>
          <p className="mt-3 text-sm text-text-muted">{t("shopGroup.events.notAvailable")}</p>
          <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}`}>{t("shopGroup.actions.backToShop")}</Link>
          </Button>
        </section>
        <ShopFooter />
      </main>
    );
  }

  if (!event || !Number.isInteger(eventId) || eventId <= 0) {
    return (
      <main className="min-h-screen bg-page text-text-main">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
          <h1 className="text-3xl font-bold text-text-main">{t("shopGroup.events.notFoundTitle")}</h1>
          <p className="mt-3 text-sm text-text-muted">{t("shopGroup.events.notFoundDescription")}</p>
          <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}/events`}>{t("shopGroup.actions.backToEvents")}</Link>
          </Button>
        </section>
        <ShopFooter />
      </main>
    );
  }

  const image = getGroupItemImage(event);
  const locationQuery = event.location_text?.trim()
    || company.address?.trim()
    || [company.city, company.state].map((value) => value?.trim() || "").filter((value) => value.length > 0).join(", ");
  const showPaymentForm = !event.is_free && !soldOut && !activeBooking;
  const autoConfirmBookings = settings?.auto_confirm_bookings ?? true;
  const accountOutcome = freeSubmitResult?.accountOutcome ?? "NOT_REQUESTED";
  const accountCopy = (() => {
    switch (accountOutcome) {
      case "ACCOUNT_CREATED_PENDING_VERIFICATION":
        return {
          title: t("freeEventReg.account.created.title"),
          body: t("freeEventReg.account.created.body"),
          cta: t("freeEventReg.account.created.cta"),
          showOtp: true,
          manualSignIn: false,
        };
      case "ACCOUNT_FOUND_BY_EMAIL":
        return {
          title: t("freeEventReg.account.foundByEmail.title"),
          body: t("freeEventReg.account.foundByEmail.body"),
          cta: t("freeEventReg.account.foundByEmail.cta"),
          showOtp: true,
          manualSignIn: false,
        };
      case "ACCOUNT_FOUND_BY_PHONE":
        return {
          title: t("freeEventReg.account.foundByPhone.title"),
          body: t("freeEventReg.account.foundByPhone.body"),
          cta: t("freeEventReg.account.foundByPhone.cta"),
          showOtp: true,
          manualSignIn: false,
        };
      case "ACCOUNT_ALREADY_EXISTS":
        return {
          title: t("freeEventReg.account.exists.title"),
          body: t("freeEventReg.account.exists.body"),
          cta: t("freeEventReg.account.exists.cta"),
          showOtp: true,
          manualSignIn: false,
        };
      case "ACCOUNT_CONFLICT_PHONE_EMAIL":
        return {
          title: t("freeEventReg.account.conflict.title"),
          body: t("freeEventReg.account.conflict.body"),
          cta: t("freeEventReg.account.conflict.cta"),
          showOtp: false,
          manualSignIn: true,
        };
      default:
        return null;
    }
  })();
  const showAccountSection = Boolean(accountCopy);
  const showOtpSection = Boolean(accountCopy?.showOtp && freeSubmitResult?.otpSection?.show);
  const otpTargetLabel = freeSubmitResult?.otpSection?.maskedDestination || (
    otpChannel === "email" ? freeSubmitContact?.email : buildOtpPhoneTarget(freeSubmitContact)
  ) || "";

  return (
    <main className="min-h-screen bg-page text-text-main">
      <section className="border-b border-surface-border bg-surface py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 md:px-8">
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" className="w-fit">
              <Link href={`/shop/${slug}/events`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("shopGroup.actions.backToEvents")}
              </Link>
            </Button>
            <ShareButton title={event.title} text={event.description ?? undefined} size="sm" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{t("shopGroup.events.eyebrow")}</p>
          <h1 className="font-heading text-3xl font-bold text-text-main md:text-4xl">{event.title}</h1>
          <p className="text-sm text-text-muted">{t("shopGroup.events.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <article className="space-y-4 rounded-xl border border-surface-border bg-surface p-4 shadow-card">
          <div className="relative h-44 w-full overflow-hidden rounded-lg bg-section md:h-64">
            {image ? (
              <img src={getImageUrl(image) || undefined} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">{t("shopGroup.media.noCover")}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{event.is_free ? t("shopGroup.labels.free") : t("shopGroup.labels.paid")}</Badge>
          </div>

          {event.description ? (
            <div
              className="text-sm text-text-muted [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
              // Description HTML is sanitized server-side before persistence.
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          ) : null}

          <div className="grid gap-2 text-sm text-text-muted">
            <p>{formatGroupDateRange(event.start_at, event.end_at, locale)}</p>
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
        </article>

        <aside className="space-y-4">
          <article className="space-y-4 rounded-xl border border-surface-border bg-surface p-4 shadow-card">
            {!event.is_free ? (
              <>
                <h2 className="text-xl font-semibold text-text-main">
                  {t("shopGroup.events.registerPaid", { price: formatGroupMoney(event.price_cents, company.currency) })}
                </h2>
                <p className="text-sm text-text-muted">
                  {autoConfirmBookings
                    ? t("shopGroup.events.autoConfirmOn")
                    : t("shopGroup.events.autoConfirmOff")}
                </p>
              </>
            ) : null}

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

            {event.is_free ? (
              freeRegState?.status ? (
                <FreeEventRegistrationForm
                  eventId={event.id}
                  companyId={company.id}
                  slug={slug}
                  customTos={settings?.custom_tos}
                  prefill={freeRegState?.prefill ?? null}
                  existingStatus={freeRegState.status}
                  onRegistered={(status) => {
                    setFreeRegState((prev) =>
                      prev
                        ? { ...prev, hasRegistration: true, status }
                        : { hasRegistration: true, status, prefill: null },
                    );
                  }}
                  onSubmitResult={handleFreeRegSubmitted}
                />
              ) : (
                <>
                  <Button
                    className="w-full bg-brand text-white hover:bg-brand-hover"
                    onClick={() => setIsFreeRegModalOpen(true)}
                  >
                    {t("freeEventReg.openModalCta")}
                  </Button>

                  <Dialog open={isFreeRegModalOpen} onOpenChange={setIsFreeRegModalOpen}>
                    <DialogContent
                      forceMount
                      onInteractOutside={(event) => event.preventDefault()}
                      className="max-h-[90vh] overflow-y-auto sm:max-w-md"
                    >
                      <DialogHeader className="text-left sm:text-left">
                        <DialogTitle className="text-xl font-semibold text-text-main">
                          {t("shopGroup.events.registerFree")}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-text-muted">
                          {autoConfirmBookings
                            ? t("shopGroup.events.autoConfirmOn")
                            : t("shopGroup.events.autoConfirmOff")}
                        </DialogDescription>
                      </DialogHeader>
                      <FreeEventRegistrationForm
                        eventId={event.id}
                        companyId={company.id}
                        slug={slug}
                        customTos={settings?.custom_tos}
                        prefill={freeRegState?.prefill ?? null}
                        existingStatus={null}
                        onRegistered={(status) => {
                          setFreeRegState((prev) =>
                            prev
                              ? { ...prev, hasRegistration: true, status }
                              : { hasRegistration: true, status, prefill: null },
                          );
                        }}
                        onSubmitResult={handleFreeRegSubmitted}
                      />
                    </DialogContent>
                  </Dialog>
                </>
              )
            ) : (
              <>
                {!user?.id ? (
                  <Button
                    className="w-full bg-brand text-white hover:bg-brand-hover"
                    onClick={handleSignInToContinue}
                  >
                    {t("shopGroup.actions.signInToContinue")}
                  </Button>
                ) : activeBooking ? (
                  <div className="space-y-3">
                    <Badge variant="outline">{t(`shopGroup.status.${activeBooking.status}`)}</Badge>
                    <p className="text-sm text-text-muted">
                      {activeBooking.status === "CONFIRMED"
                        ? t("shopGroup.events.alreadyConfirmed")
                        : activeBooking.status === "PENDING"
                          ? t("shopGroup.events.alreadyPending")
                          : t("shopGroup.events.alreadyWaitlisted")}
                    </p>
                    {activeBooking.status === "WAITLISTED" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleLeaveWaitlist()}
                        disabled={busyAction === "leave_waitlist"}
                      >
                        {busyAction === "leave_waitlist" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("shopGroup.actions.leaveWaitlist")}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="w-full">
                        <Link href={appendShopParam("/me/group-reservations", slug)}>
                          {t("shopGroup.actions.viewMyGroupReservations")}
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : soldOut ? (
                  <div className="space-y-3">
                    {canUseAdvanced ? (
                      <Button
                        className="w-full bg-brand text-white hover:bg-brand-hover"
                        onClick={() => void handleJoinWaitlist()}
                        disabled={busyAction === "waitlist"}
                      >
                        {busyAction === "waitlist" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("shopGroup.actions.joinWaitlist")}
                      </Button>
                    ) : (
                      <p className="text-sm text-text-muted">{t("shopGroup.events.waitlistUnavailable")}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-muted">{t("shopGroup.fields.spots")}</label>
                      <Input
                        type="number"
                        min={1}
                        max={Math.max(1, event.max_capacity)}
                        value={bookedSpots}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          const max = Math.max(1, event.max_capacity);
                          setBookedSpots(Number.isInteger(val) && val > max ? String(max) : e.target.value);
                        }}
                      />
                    </div>

                    {extraAttendees.length > 0 ? (
                      <div className="space-y-3 rounded-md border border-surface-border bg-section p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          {t("shopGroup.forms.extraAttendeesTitle")}
                        </p>
                        <div className="space-y-3">
                          {extraAttendees.map((attendee, index) => (
                            <div key={`extra-attendee-${index}`} className="rounded-md border border-surface-border bg-surface p-3">
                              <p className="mb-2 text-xs font-medium text-text-muted">{t("shopGroup.forms.extraTicketLabel", { number: index + 2 })}</p>
                              <div className="grid gap-2">
                                <Input
                                  placeholder={t("shopGroup.forms.fullNamePlaceholder")}
                                  value={attendee.full_name}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setExtraAttendees((prev) => prev.map((row, rowIndex) => (
                                      rowIndex === index ? { ...row, full_name: value } : row
                                    )));
                                  }}
                                />
                                <Input
                                  type="email"
                                  placeholder={t("shopGroup.forms.emailOptionalPlaceholder")}
                                  value={attendee.email}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setExtraAttendees((prev) => prev.map((row, rowIndex) => (
                                      rowIndex === index ? { ...row, email: value } : row
                                    )));
                                  }}
                                />
                                <Input
                                  placeholder={t("shopGroup.forms.phoneOptionalPlaceholder")}
                                  value={attendee.phone}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setExtraAttendees((prev) => prev.map((row, rowIndex) => (
                                      rowIndex === index ? { ...row, phone: value } : row
                                    )));
                                  }}
                                />
                                <p className="text-[11px] text-text-muted">{t("shopGroup.forms.contactHint")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
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

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-muted">{t("shopGroup.fields.notes")}</label>
                      <textarea
                        className="min-h-[90px] w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-text-main"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("shopGroup.forms.notesPlaceholder")}
                      />
                    </div>

                    <Button
                      className="w-full bg-brand text-white hover:bg-brand-hover"
                      onClick={() => void handleBook()}
                      disabled={busyAction === "book"}
                    >
                      {busyAction === "book" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t("shopGroup.actions.completeBooking")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </article>
        </aside>
      </section>

      <Dialog open={isFreeOutcomeModalOpen} onOpenChange={setIsFreeOutcomeModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          {freeSubmitResult ? (
            <>
              <DialogHeader className="text-left sm:text-left">
                <DialogTitle className="text-xl font-semibold text-text-main">
                  {freeSubmitResult.modalType === "POSITIVE"
                    ? t("freeEventReg.positiveModal.title")
                    : t("freeEventReg.negativeModal.title")}
                </DialogTitle>
                <DialogDescription className="text-sm text-text-muted">
                  {freeSubmitResult.modalType === "POSITIVE"
                    ? t("freeEventReg.positiveModal.body", { maxCapacity: event.max_capacity })
                    : t("freeEventReg.negativeModal.body")}
                </DialogDescription>
              </DialogHeader>

              {freeSubmitResult.modalType === "POSITIVE" ? (
                <div className="space-y-1">
                  <p className="text-sm text-text-muted">{t("freeEventReg.positiveModal.policyLine1")}</p>
                  <p className="text-sm text-text-muted">{t("freeEventReg.positiveModal.policyLine2")}</p>
                </div>
              ) : null}

              {freeSubmitResult.modalType === "NEGATIVE" && event.no_availability_message?.trim() ? (
                <p className="text-sm text-text-muted">{event.no_availability_message.trim()}</p>
              ) : null}

              {freeSubmitResult.reservationCode ? (
                <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {t("freeEventReg.confirmation.codeLabel")}
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-[0.15em] text-emerald-800">
                    {freeSubmitResult.reservationCode}
                  </p>
                  <p className="text-sm text-emerald-700">{t("freeEventReg.confirmation.checkInHint")}</p>
                  <p className="text-xs text-emerald-700">{t("freeEventReg.modal.codeBody")}</p>
                </div>
              ) : null}

              {showAccountSection && accountCopy ? (
                <div className="space-y-3 rounded-md border border-surface-border bg-section p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {t("freeEventReg.account.sectionTitle")}
                  </p>
                  <h3 className="text-base font-semibold text-text-main">{accountCopy.title}</h3>
                  <p className="text-sm text-text-muted">{accountCopy.body}</p>

                  {showOtpSection ? (
                    <div className="space-y-3">
                      {otpAvailableChannels.length > 1 ? (
                        <div className="flex gap-2">
                          {otpAvailableChannels.includes("email") ? (
                            <Button
                              type="button"
                              variant={otpChannel === "email" ? "default" : "outline"}
                              className="flex-1"
                              onClick={() => setOtpChannel("email")}
                              disabled={otpBusy}
                            >
                              {t("freeEventReg.account.channelEmail")}
                            </Button>
                          ) : null}
                          {otpAvailableChannels.includes("phone") ? (
                            <Button
                              type="button"
                              variant={otpChannel === "phone" ? "default" : "outline"}
                              className="flex-1"
                              onClick={() => setOtpChannel("phone")}
                              disabled={otpBusy}
                            >
                              {t("freeEventReg.account.channelPhone")}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted">
                          {t("freeEventReg.account.otpLabel")}
                          {otpTargetLabel ? ` · ${otpTargetLabel}` : ""}
                        </label>
                        <Input
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder={t("freeEventReg.account.otpPlaceholder")}
                          inputMode="numeric"
                          maxLength={8}
                        />
                      </div>

                      {otpError ? (
                        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                          {otpError}
                        </p>
                      ) : null}
                      {otpSuccess ? (
                        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          {otpSuccess}
                        </p>
                      ) : null}

                      <Button
                        className="w-full bg-brand text-white hover:bg-brand-hover"
                        onClick={() => void handleOtpVerify()}
                        disabled={otpBusy}
                      >
                        {otpBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {accountCopy.cta}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleOtpResend()}
                        disabled={otpBusy || !canResend}
                      >
                        {canResend
                          ? t("freeEventReg.account.resendCode")
                          : t("freeEventReg.account.resendIn", { seconds: secondsRemaining })}
                      </Button>
                    </div>
                  ) : null}

                  {accountCopy.manualSignIn ? (
                    <Button
                      className="w-full bg-brand text-white hover:bg-brand-hover"
                      onClick={() => {
                        setIsFreeOutcomeModalOpen(false);
                        router.push(buildSignInRedirectFromCurrentLocation(`/shop/${slug}/events/${event.id}`));
                      }}
                    >
                      {accountCopy.cta}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <Button
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  onClick={() => setIsFreeOutcomeModalOpen(false)}
                >
                  {t("freeEventReg.successModal.cta")}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={appendShopParam("/me/group-reservations", slug)}>
                    {t("freeEventReg.viewMyReservations")}
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ShopFooter />
    </main>
  );
}
