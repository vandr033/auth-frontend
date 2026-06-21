"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Loader2, LockKeyhole, MapPin, ShieldCheck, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryPhoneSelect } from "@/components/ui/country-phone-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { useI18n } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useAuth } from "@/lib/useAuth";
import { DEFAULT_COUNTRY_CODE } from "@/lib/phone-country";
import { getImageUrl } from "@/utils/image-url";
import { useShop } from "@/app/shop/contexts/ShopContext";
import { ShopUnavailableState } from "@/app/shop/components/ShopUnavailableState";
import {
  getPublicSessionAttendanceState,
  resendPublicSessionAttendance,
  startPublicSessionAttendance,
  submitPublicSessionAttendance,
  verifyPublicSessionAttendance,
  type PublicSessionAttendanceState,
  type PublicSessionAttendanceSubmitResult,
} from "@/app/shop/lib/groupReservationsApi";
import {
  formatGroupDateTime,
  formatGroupMoney,
  getGroupItemImage,
} from "@/app/shop/lib/groupReservationsFormat";

type GuestStep = "identity" | "verify" | "submit";

export default function PublicSessionAttendancePage() {
  const { t, locale } = useI18n();
  const params = useParams<{ slug: string; token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const { user, loading: authLoading, refreshSession } = useAuth();
  const { company, isShopActive, loading: shopLoading, error: shopError } = useShop();

  const [loading, setLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [state, setState] = React.useState<PublicSessionAttendanceState | null>(null);
  const [submitResult, setSubmitResult] = React.useState<PublicSessionAttendanceSubmitResult | null>(null);
  const [prefillApplied, setPrefillApplied] = React.useState(false);

  const [guestStep, setGuestStep] = React.useState<GuestStep>("identity");
  const [guestSessionId, setGuestSessionId] = React.useState<string | null>(null);
  const [guestCode, setGuestCode] = React.useState("");

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [countryCode, setCountryCode] = React.useState(DEFAULT_COUNTRY_CODE);
  const [phonePrefix, setPhonePrefix] = React.useState("591");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [accessCode, setAccessCode] = React.useState("");

  const [busyAction, setBusyAction] = React.useState<"load" | "start" | "resend" | "verify" | "submit" | null>(null);

  const loadState = React.useCallback(async () => {
    if (!token) return;
    setBusyAction("load");
    setLoading(true);
    setPageError(null);
    try {
      const nextState = await getPublicSessionAttendanceState(token);
      setState(nextState);
    } catch (error) {
      setState(null);
      setPageError(error instanceof Error ? error.message : "No se pudo cargar el link de asistencia.");
    } finally {
      setBusyAction(null);
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (authLoading) return;
    void loadState();
  }, [authLoading, loadState]);

  React.useEffect(() => {
    if (!state || prefillApplied) return;

    if (state.profile.full_name) {
      setFullName(state.profile.full_name);
    }
    if (state.profile.email) {
      setEmail(state.profile.email);
    }
    if (state.profile.country_code) {
      setCountryCode(state.profile.country_code);
    }
    if (state.profile.phone_prefix) {
      setPhonePrefix(state.profile.phone_prefix);
    }
    if (state.profile.phone_number) {
      setPhoneNumber(state.profile.phone_number);
    }

    setPrefillApplied(true);
  }, [prefillApplied, state]);

  const requiresAccessCode = Boolean(state?.session.requires_access_code);
  const profileMissing = state?.profile.missing_profile_fields ?? [];
  const requiresMissingName = profileMissing.includes("full_name");
  const requiresMissingEmail = profileMissing.includes("email");
  const requiresMissingPhone = profileMissing.includes("phone");

  const handleStartVerification = async () => {
    if (!token) return;
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhonePrefix = phonePrefix.replace(/\D/g, "");
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");

    if (!normalizedName || !normalizedEmail || !normalizedPhonePrefix || !normalizedPhoneNumber) {
      await notify.warning("Completa nombre, email y celular para continuar.");
      return;
    }

    setBusyAction("start");
    try {
      const result = await startPublicSessionAttendance(token, {
        full_name: normalizedName,
        email: normalizedEmail,
        countryCode,
        phonePrefix: normalizedPhonePrefix,
        phoneNumber: normalizedPhoneNumber,
      });
      if (result.accountOutcome === "ACCOUNT_CONFLICT_PHONE_EMAIL") {
        await notify.warning("El correo y el celular pertenecen a cuentas distintas. Inicia sesion manualmente para continuar.");
        return;
      }
      if (!result.checkout_session_id || !result.canVerify) {
        await notify.warning("No pudimos enviar el codigo de verificacion.");
        return;
      }
      setGuestSessionId(result.checkout_session_id);
      setGuestStep("verify");
      await notify.success("Te enviamos un codigo por correo y WhatsApp.");
    } catch (error) {
      await notify.error(error instanceof Error ? error.message : "No se pudo enviar el codigo.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleResendVerification = async () => {
    if (!token || !guestSessionId) return;
    setBusyAction("resend");
    try {
      await resendPublicSessionAttendance(token, {
        checkout_session_id: guestSessionId,
      });
      await notify.success("Enviamos un nuevo codigo.");
    } catch (error) {
      await notify.error(error instanceof Error ? error.message : "No se pudo reenviar el codigo.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyCode = async () => {
    if (!token || !guestSessionId) return;
    if (!guestCode.trim()) {
      await notify.warning("Ingresa el codigo de verificacion.");
      return;
    }

    setBusyAction("verify");
    try {
      await verifyPublicSessionAttendance(token, {
        checkout_session_id: guestSessionId,
        code: guestCode.trim(),
      });
      await refreshSession();
      await loadState();
      setGuestStep("submit");
      await notify.success("Identidad verificada.");
    } catch (error) {
      await notify.error(error instanceof Error ? error.message : "No se pudo verificar el codigo.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!token || !state) return;
    if (requiresMissingName && !fullName.trim()) {
      await notify.warning("Ingresa tu nombre.");
      return;
    }
    if (requiresMissingEmail && !email.trim()) {
      await notify.warning("Ingresa tu email.");
      return;
    }
    if (requiresMissingPhone && (!phonePrefix.trim() || !phoneNumber.trim())) {
      await notify.warning("Ingresa tu celular.");
      return;
    }
    if (requiresAccessCode && !accessCode.trim()) {
      await notify.warning("Ingresa el codigo de acceso.");
      return;
    }

    setBusyAction("submit");
    try {
      const result = await submitPublicSessionAttendance(token, {
        checkout_session_id: guestSessionId ?? undefined,
        access_code: accessCode.trim() || null,
        full_name: requiresMissingName ? fullName.trim() : undefined,
        email: requiresMissingEmail ? email.trim().toLowerCase() : undefined,
        countryCode: requiresMissingPhone ? countryCode : undefined,
        phonePrefix: requiresMissingPhone ? phonePrefix.replace(/\D/g, "") : undefined,
        phoneNumber: requiresMissingPhone ? phoneNumber.replace(/\D/g, "") : undefined,
      });
      setSubmitResult(result);
      await loadState();
      await notify.success("Asistencia registrada.");
    } catch (error) {
      await notify.error(error instanceof Error ? error.message : "No se pudo registrar la asistencia.");
    } finally {
      setBusyAction(null);
    }
  };

  if (shopLoading || authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </main>
    );
  }

  if (shopError || !company) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("shopHome.pageNotFound")}</h1>
          <p className="mt-2 text-sm text-text-muted">{shopError || t("shopHome.shopNotFoundMessage")}</p>
        </div>
      </main>
    );
  }

  if (!isShopActive) {
    return <ShopUnavailableState slug={slug} />;
  }

  if (pageError || !state) {
    return (
      <main className="min-h-screen bg-page text-text-main">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
          <h1 className="text-3xl font-bold text-text-main">Link de asistencia no disponible</h1>
          <p className="mt-3 text-sm text-text-muted">{pageError || "No pudimos abrir este link de asistencia."}</p>
          <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover">
            <Link href={`/shop/${slug}`}>Volver a la tienda</Link>
          </Button>
        </section>
        <ShopFooter />
      </main>
    );
  }

  const image = getGroupItemImage(state.group_class);
  const lockedToSignedInAccount = Boolean(state.is_authenticated && user?.id);
  const alreadyCheckedIn = state.already_checked_in || submitResult?.outcome === "already_checked_in";
  const successOutcome = submitResult?.outcome ?? (alreadyCheckedIn ? "already_checked_in" : null);

  return (
    <main className="min-h-screen bg-page text-text-main">
      <section className="border-b border-surface-border bg-surface py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 md:px-8">
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/shop/${slug}/classes/${state.group_class.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al curso
            </Link>
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Asistencia publica</p>
          <h1 className="font-heading text-3xl font-bold text-text-main md:text-4xl">{state.group_class.title}</h1>
          <p className="text-sm text-text-muted">
            Registra tu asistencia para la sesion del {formatGroupDateTime(state.session.start_at, locale)}.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <article className="space-y-4 rounded-xl border border-surface-border bg-surface p-4 shadow-card">
          <div className="relative h-60 w-full overflow-hidden rounded-lg bg-section">
            {image ? (
              <img src={getImageUrl(image) || undefined} alt={state.group_class.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
                Sin imagen del curso
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{state.group_class.pricing_mode}</Badge>
            <Badge variant="outline">{formatGroupMoney(state.group_class.price_cents, company.currency)}</Badge>
            {requiresAccessCode ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Requiere codigo de acceso
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm text-text-muted">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatGroupDateTime(state.session.start_at, locale)} - {formatGroupDateTime(state.session.end_at, locale)}
            </p>
            {state.group_class.location_text ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {state.group_class.location_text}
              </p>
            ) : null}
          </div>

          {state.group_class.description ? (
            <div
              className="text-sm text-text-muted [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: state.group_class.description }}
            />
          ) : null}
        </article>

        <aside className="space-y-4">
          <article className="space-y-4 rounded-xl border border-surface-border bg-surface p-4 shadow-card">
            <div>
              <h2 className="text-xl font-semibold text-text-main">Confirmar asistencia</h2>
              <p className="mt-1 text-sm text-text-muted">
                {lockedToSignedInAccount
                  ? "Tu identidad esta bloqueada a la cuenta con la que iniciaste sesion."
                  : "Verifica tu identidad para que podamos registrarte y marcar tu asistencia."}
              </p>
            </div>

            {successOutcome ? (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <Ticket className="h-4 w-4" />
                  {successOutcome === "already_checked_in"
                    ? "Tu asistencia ya estaba registrada."
                    : successOutcome === "checked_in_existing_enrollment"
                      ? "Asistencia registrada."
                      : "Te inscribimos y registramos tu asistencia."}
                </div>
                <p>
                  {successOutcome === "sponsored_enrollment_created_and_checked_in"
                    ? "El negocio creo una inscripcion patrocinada para esta sesion y te marco presente."
                    : "No necesitas hacer nada mas para esta sesion."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                    <Link href={`/shop/${slug}/classes/${state.group_class.id}`}>Volver al curso</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/me/group-reservations">Mis reservas</Link>
                  </Button>
                </div>
              </div>
            ) : !lockedToSignedInAccount && guestStep === "identity" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nombre completo</Label>
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Celular</Label>
                  <CountryPhoneSelect
                    countryCode={countryCode}
                    phonePrefix={phonePrefix}
                    phoneNumber={phoneNumber}
                    defaultCountryCode={DEFAULT_COUNTRY_CODE}
                    onChange={(value) => {
                      setCountryCode(value.countryCode);
                      setPhonePrefix(value.phonePrefix);
                      setPhoneNumber(value.phoneNumber);
                    }}
                  />
                </div>
                <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => void handleStartVerification()} disabled={busyAction === "start"}>
                  {busyAction === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar codigo
                </Button>
              </div>
            ) : !lockedToSignedInAccount && guestStep === "verify" ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Codigo de verificacion</Label>
                  <Input value={guestCode} onChange={(event) => setGuestCode(event.target.value)} inputMode="numeric" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="flex-1 bg-brand text-white hover:bg-brand-hover" onClick={() => void handleVerifyCode()} disabled={busyAction === "verify"}>
                    {busyAction === "verify" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verificar codigo
                  </Button>
                  <Button variant="outline" onClick={() => void handleResendVerification()} disabled={busyAction === "resend"}>
                    {busyAction === "resend" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Reenviar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lockedToSignedInAccount ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <LockKeyhole className="h-4 w-4" />
                      Cuenta autenticada
                    </div>
                    <p className="mt-2">{state.profile.full_name || user?.name || "Sin nombre registrado"}</p>
                    <p>{state.profile.email || user?.email || "Sin email registrado"}</p>
                    <p>
                      {state.profile.phone_prefix && state.profile.phone_number
                        ? `+${state.profile.phone_prefix} ${state.profile.phone_number}`
                        : "Sin celular registrado"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    Identidad verificada. Ahora confirma la asistencia.
                  </p>
                )}

                {requiresMissingName ? (
                  <div className="space-y-1">
                    <Label>Nombre completo</Label>
                    <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
                  </div>
                ) : null}
                {requiresMissingEmail ? (
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                ) : null}
                {requiresMissingPhone ? (
                  <div className="space-y-1">
                    <Label>Celular</Label>
                    <CountryPhoneSelect
                      countryCode={countryCode}
                      phonePrefix={phonePrefix}
                      phoneNumber={phoneNumber}
                      defaultCountryCode={DEFAULT_COUNTRY_CODE}
                      onChange={(value) => {
                        setCountryCode(value.countryCode);
                        setPhonePrefix(value.phonePrefix);
                        setPhoneNumber(value.phoneNumber);
                      }}
                    />
                  </div>
                ) : null}
                {requiresAccessCode ? (
                  <div className="space-y-1">
                    <Label>Codigo de acceso</Label>
                    <Input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
                  </div>
                ) : null}
                <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => void handleSubmitAttendance()} disabled={busyAction === "submit"}>
                  {busyAction === "submit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmar asistencia
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
