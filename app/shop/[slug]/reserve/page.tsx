"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileUp,
  Loader2,
  MessageCircle,
  Plus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { formatDialCode } from "@/lib/phone-country";
import { useAuth } from "@/lib/useAuth";
import { getImageUrl } from "@/utils/image-url";
import { useShop } from "../../contexts/ShopContext";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import {
  createPublicRestaurantReservation,
  getPublicRestaurantAvailability,
  getPublicRestaurantConfiguration,
  uploadPublicRestaurantDepositProof,
  type PublicRestaurantConfiguration,
  type PublicRestaurantSlot,
} from "../../lib/restaurantReservationsApi";

type Guest = { name: string; phone: string; phonePrefix: string; countryCode: string };

function localDate(timezone: string) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (name: string) =>
    values.find((part) => part.type === name)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function apiError(error: unknown) {
  const value = error as { message?: string; status?: number };
  return {
    message: value.message || "No pudimos completar la solicitud.",
    status: value.status,
  };
}

export default function PublicRestaurantReservationPage() {
  const { slug, company, loading: shopLoading } = useShop();
  const { user, isAuthenticated, sendPhoneOtp, verifyPhoneOtp, completeCustomerPhoneProfile } = useAuth();
  const [config, setConfig] = useState<PublicRestaurantConfiguration | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<PublicRestaurantSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [depositProofFile, setDepositProofFile] = useState<File | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ code: string; status: string } | null>(null);

  useEffect(() => {
    let active = true;
    getPublicRestaurantConfiguration(slug)
      .then((value) => {
        if (!active) return;
        setConfig(value);
        setPartySize(value.restaurant.minimumPartySize);
        setDate(localDate(value.company.timezone));
        setPhonePrefix((current) => current || value.restaurant.phonePrefix);
      })
      .catch((error) => active && setLoadError(error.message));
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fullName = [user.first_name, user.last_name].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join(" ").trim() || user.name || "";
    setName((current) => current || fullName);
    setPhone((current) => current || user.phoneNumber || "");
    setPhonePrefix(user.phone_prefix || config?.restaurant.phonePrefix || "");
    setPhoneCountryCode((user.country_code as string | null | undefined) || "");
    setEmail((current) => current || user.email || "");
  }, [config, isAuthenticated, user]);

  useEffect(() => {
    if (!config || !date || !partySize) return;
    let active = true;
    setSlotsLoading(true);
    setSlotsError(null);
    setTime("");
    getPublicRestaurantAvailability(slug, date, partySize)
      .then((value) => active && setSlots(value.slots))
      .catch((error) => {
        if (active) {
          setSlots([]);
          setSlotsError(error.message);
        }
      })
      .finally(() => active && setSlotsLoading(false));
    return () => {
      active = false;
    };
  }, [config, date, partySize, slug]);

  const limits = useMemo(
    () =>
      config
        ? {
            min: localDate(config.company.timezone),
            max: addDays(
              localDate(config.company.timezone),
              config.restaurant.maximumAdvanceDays,
            ),
          }
        : null,
    [config],
  );
  const maximumGuests = Math.max(partySize - 1, 0);
  const depositTotalCents = config?.restaurant.depositEnabled
    ? config.restaurant.depositAmountCents * (config.restaurant.depositMode === "PER_PERSON" ? partySize : 1)
    : 0;
  const currencyCode = company?.currency?.trim().toUpperCase();
  const formatMoney = (cents: number) => new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: currencyCode === "BS" || currencyCode === "BS." ? "BOB" : (/^[A-Z]{3}$/.test(currencyCode || "") ? currencyCode! : "BOB"),
    maximumFractionDigits: 2,
  }).format(cents / 100);

  const updatePartySize = (nextPartySize: number) => {
    setPartySize(nextPartySize);
    setGuests((current) => current.slice(0, Math.max(nextPartySize - 1, 0)));
  };

  const addGuest = () => {
    setGuests((current) =>
      current.length >= maximumGuests ? current : [...current, { name: "", phone: "", phonePrefix: phonePrefix || config?.restaurant.phonePrefix || "591", countryCode: phoneCountryCode }],
    );
  };

  const updateGuest = (index: number, field: keyof Guest, value: string) => {
    setGuests((current) =>
      current.map((guest, guestIndex) =>
        guestIndex === index ? { ...guest, [field]: value } : guest,
      ),
    );
  };

  const removeGuest = (index: number) => {
    setGuests((current) => current.filter((_, guestIndex) => guestIndex !== index));
  };

  const createReservation = async () => {
    if (!config || !time || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const depositProofImageUrl = depositTotalCents > 0 && depositProofFile
        ? await uploadPublicRestaurantDepositProof(slug, depositProofFile)
        : null;
      const value = await createPublicRestaurantReservation(slug, {
        date,
        time,
        partySize,
        customer: { name, phone: phone || null, phonePrefix: phonePrefix || null, countryCode: phoneCountryCode || null, email: email || null },
        guests,
        depositProofImageUrl,
        notes: notes || null,
      });
      setDepositProofFile(null);
      setResult({ code: value.reservation.code, status: value.reservation.status });
    } catch (error: unknown) {
      const failure = apiError(error);
      setSubmitError(failure.message);
      if (failure.status === 409) {
        setTime("");
        try {
          const availability = await getPublicRestaurantAvailability(slug, date, partySize);
          setSlots(availability.slots);
        } catch {
          // Preserve the completed form so the customer only needs a new time.
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!config || !time || submitting) return;
    setSubmitError(null);
    if (config.restaurant.requirePhone && !phone.trim()) {
      setSubmitError("Ingresá tu número de WhatsApp.");
      return;
    }
    if (guests.some((guest) => !guest.name.trim() || !guest.phone.trim())) {
      setSubmitError("Completá el nombre y WhatsApp de cada acompañante.");
      return;
    }
    if (depositTotalCents > 0 && !depositProofFile) {
      setSubmitError("Subí el comprobante del depósito para continuar.");
      return;
    }
    if (isAuthenticated) {
      await createReservation();
      return;
    }
    if (!phone.trim()) {
      setSubmitError("Ingresá tu WhatsApp para verificar tu reserva.");
      return;
    }
    setVerifying(true);
    try {
      await sendPhoneOtp({ phoneNumber: phone, phonePrefix: phonePrefix || config.restaurant.phonePrefix, countryCode: phoneCountryCode || undefined });
      setVerificationPending(true);
    } catch (error) {
      setSubmitError(apiError(error).message);
    } finally {
      setVerifying(false);
    }
  };

  const verifyAndCreateReservation = async () => {
    if (!config || verificationCode.trim().length !== 6 || verifying) return;
    setVerifying(true);
    setSubmitError(null);
    try {
      await verifyPhoneOtp({ phoneNumber: phone, phonePrefix: phonePrefix || config.restaurant.phonePrefix, countryCode: phoneCountryCode || undefined }, verificationCode.trim());
      const [firstName, ...lastName] = name.trim().split(/\s+/);
      await completeCustomerPhoneProfile(firstName || "Cliente", phone, phonePrefix || config.restaurant.phonePrefix, lastName.join(" ") || undefined, phoneCountryCode || undefined);
      await createReservation();
    } catch (error) {
      setSubmitError(apiError(error).message);
    } finally {
      setVerifying(false);
    }
  };

  if (shopLoading) return <main className="min-h-[70vh] bg-page" />;
  if (loadError || !config || !company) return <ShopUnavailableState slug={slug} />;

  if (result) {
    return (
      <main className="mx-auto min-h-[70vh] max-w-2xl px-4 py-10 text-text-main sm:px-6">
        <section className="rounded-2xl border border-surface-border bg-surface p-6 text-center shadow-sm sm:p-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand" aria-hidden="true" />
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-brand">
            {result.status === "CONFIRMED" ? "Reserva confirmada" : "Reserva pendiente"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {result.status === "CONFIRMED"
              ? "Tu mesa está reservada"
              : "Recibimos tu solicitud"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-text-muted">
            {result.status === "CONFIRMED"
              ? "Tu reserva quedó confirmada. Guardá este enlace para consultarla o cancelarla si corresponde."
              : "El restaurante revisará tu solicitud. Guardá este enlace para consultar su estado."}
          </p>
          <Link href={`/shop/${slug}/reservation/${result.code}`} className="mt-7 inline-flex">
            <Button className="min-h-11 bg-brand text-white hover:bg-brand-hover">
              Ver reserva
            </Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-7 text-text-main sm:px-6 sm:py-10">
      <header className="mb-7">
        <p className="text-sm font-semibold text-brand">{config.company.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Reserva una mesa
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Elegí el tamaño de tu grupo, una fecha y un horario disponible.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-8">
        <section
          aria-labelledby="reservation-basics"
          className="grid gap-5 rounded-2xl border border-surface-border bg-surface p-5 sm:grid-cols-2 sm:p-6"
        >
          <h2 id="reservation-basics" className="sr-only">
            Datos de la reserva
          </h2>
          <label className="grid gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Comensales
            </span>
            <select
              className="min-h-11 rounded-md border border-surface-border bg-page px-3 text-base"
              value={partySize}
              onChange={(event) => updatePartySize(Number(event.target.value))}
            >
              {Array.from(
                {
                  length:
                    config.restaurant.maximumPartySize -
                    config.restaurant.minimumPartySize +
                    1,
                },
                (_, index) => config.restaurant.minimumPartySize + index,
              ).map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "persona" : "personas"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Seleccioná una fecha
            </span>
            <input
              className="min-h-11 rounded-md border border-surface-border bg-page px-3 text-base"
              type="date"
              required
              min={limits?.min}
              max={limits?.max}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </section>

        <section aria-labelledby="reservation-times">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 id="reservation-times" className="text-lg font-bold">
              Horarios disponibles
            </h2>
          </div>
          {slotsLoading ? (
            <p className="flex min-h-12 items-center gap-2 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando horarios…
            </p>
          ) : slotsError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {slotsError}
            </p>
          ) : slots.length === 0 ? (
            <p className="rounded-lg border border-surface-border bg-surface p-4 text-text-muted">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 min-[430px]:grid-cols-4 sm:grid-cols-6">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  aria-pressed={time === slot.time}
                  onClick={() => setTime(slot.time)}
                  className={`min-h-12 rounded-md border px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${slot.available ? time === slot.time ? "border-brand bg-brand text-white" : "border-surface-border bg-surface hover:border-brand" : "cursor-not-allowed border-surface-border bg-page text-text-muted line-through"}`}
                >
                  {slot.time}
                  <span className="sr-only">
                    {slot.available ? " disponible" : " no disponible"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="customer-information"
          className="rounded-2xl border border-surface-border bg-surface p-5 sm:p-6"
        >
          <h2 id="customer-information" className="text-lg font-bold">
            Información de contacto
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
              Nombre completo <span className="text-brand">*</span>
              <input
                required
                maxLength={160}
                className="min-h-11 rounded-md border border-surface-border bg-page px-3 text-base"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="grid gap-2 text-sm font-semibold">
              <span>WhatsApp {config.restaurant.requirePhone && <span className="text-brand">*</span>}</span>
              <PhoneInput
                phoneNumber={phone}
                phonePrefix={phonePrefix}
                countryCode={phoneCountryCode}
                defaultCountry="BO"
                placeholder="Número de WhatsApp"
                onChange={(value) => { setPhone(value.phoneNumber); setPhonePrefix(value.phonePrefix); setPhoneCountryCode(value.countryCode); }}
              />
              <span className="text-xs font-normal text-text-muted">Usaremos {phone ? `${formatDialCode(phonePrefix)} ${phone}` : "el prefijo y número para tus notificaciones"}.</span>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Correo electrónico {config.restaurant.requireEmail && <span className="text-brand">*</span>}
              <input
                required={config.restaurant.requireEmail}
                maxLength={255}
                type="email"
                className="min-h-11 rounded-md border border-surface-border bg-page px-3 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
              Notas
              <textarea
                maxLength={2000}
                className="min-h-24 rounded-md border border-surface-border bg-page p-3 text-base"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
        </section>

        {verificationPending && !isAuthenticated && (
          <section className="rounded-2xl border border-brand/30 bg-brand-soft-bg p-5 sm:p-6">
            <h2 className="text-lg font-bold">Verificá tu WhatsApp</h2>
            <p className="mt-1 text-sm text-text-muted">
              Enviamos un código de 6 dígitos a {formatDialCode(phonePrefix)} {phone}. Al verificarlo, crearemos tu cuenta y confirmaremos la reserva.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="min-h-11 flex-1 rounded-md border border-surface-border bg-surface px-3 text-center text-lg font-semibold tracking-[0.35em]"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
              />
              <Button type="button" disabled={verifying || verificationCode.length !== 6} onClick={() => void verifyAndCreateReservation()} className="min-h-11 bg-brand text-white hover:bg-brand-hover">
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar y reservar
              </Button>
            </div>
          </section>
        )}

        {maximumGuests > 0 && (
          <section
            aria-labelledby="guest-invitations"
            className="rounded-2xl border border-surface-border bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-brand" aria-hidden="true" />
                  <h2 id="guest-invitations" className="text-lg font-bold">
                    Acompañantes
                  </h2>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  Agregá hasta {maximumGuests} {maximumGuests === 1 ? "persona" : "personas"} a tu reserva.
                  {config.restaurant.guestWhatsappInvitationsEnabled
                    ? " Les enviaremos los detalles por WhatsApp."
                    : " El restaurante no tiene las invitaciones por WhatsApp habilitadas."}
                </p>
              </div>
              <span className="rounded-full bg-section px-2.5 py-1 text-xs font-semibold text-text-muted">
                {guests.length} de {maximumGuests}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {guests.map((guest, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-surface-border bg-page p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                >
                  <label className="grid gap-2 text-sm font-semibold">
                    Nombre del acompañante
                    <input
                      required
                      maxLength={160}
                      className="min-h-11 rounded-md border border-surface-border bg-surface px-3 text-base"
                      value={guest.name}
                      onChange={(event) => updateGuest(index, "name", event.target.value)}
                    />
                  </label>
                  <div className="grid gap-2 text-sm font-semibold">
                    <span>WhatsApp</span>
                    <PhoneInput
                      phoneNumber={guest.phone}
                      phonePrefix={guest.phonePrefix}
                      countryCode={guest.countryCode}
                      defaultCountry="BO"
                      placeholder="Número de WhatsApp"
                      onChange={(value) => setGuests((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: value.phoneNumber, phonePrefix: value.phonePrefix, countryCode: value.countryCode } : item))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-11 text-text-muted hover:text-destructive"
                    aria-label={`Quitar a ${guest.name || `acompañante ${index + 1}`}`}
                    onClick={() => removeGuest(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {guests.length < maximumGuests && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-11 border-surface-border bg-surface"
                onClick={addGuest}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar acompañante
              </Button>
            )}
            {guests.length > 0 && config.restaurant.guestWhatsappInvitationsEnabled && (
              <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <MessageCircle className="h-3.5 w-3.5 text-brand" />
                Solo agregá personas que aceptaron recibir esta invitación.
              </p>
            )}
          </section>
        )}

        {depositTotalCents > 0 && (
          <section className="rounded-2xl border border-brand/25 bg-brand-soft-bg p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">Comprobante de depósito</h2>
                <p className="mt-1 text-sm text-text-muted">Subí la captura o PDF de tu pago por {formatMoney(depositTotalCents)}. Es necesario para enviar la reserva.</p>
              </div>
            </div>
            <label className="mt-4 flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-brand/40 bg-surface px-4 text-center transition hover:border-brand">
              <span className="text-sm font-semibold text-text-main">{depositProofFile ? depositProofFile.name : "Elegir comprobante"}</span>
              <span className="mt-1 text-xs text-text-muted">JPG, PNG, WebP o PDF · máximo 5 MB</span>
              <input className="sr-only" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setDepositProofFile(event.target.files?.[0] || null)} />
            </label>
          </section>
        )}

        <section className="rounded-2xl bg-section p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <h2 className="font-bold">Resumen</h2>
            <p className="mt-1 text-sm text-text-muted">
              {partySize} {partySize === 1 ? "persona" : "personas"} · {date || "Elegí una fecha"} · {time || "Elegí un horario"}
              {guests.length > 0 && ` · ${guests.length} ${guests.length === 1 ? "acompañante" : "acompañantes"}`}
            </p>
            {depositTotalCents > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {config.restaurant.depositQrImageUrl && <img src={getImageUrl(config.restaurant.depositQrImageUrl) || ""} alt="Código QR para el depósito" className="h-16 w-16 rounded-md border border-surface-border bg-surface object-contain p-1" />}
                <p className="font-medium text-text-main">
                  Depósito: {formatMoney(depositTotalCents)} {config.restaurant.depositMode === "PER_PERSON" ? `(${formatMoney(config.restaurant.depositAmountCents)} por persona)` : "por mesa"}
                </p>
              </div>
            )}
          </div>
          <Button
            disabled={!time || submitting || verificationPending}
            type="submit"
            className="mt-4 min-h-11 w-full bg-brand text-white hover:bg-brand-hover sm:mt-0 sm:w-auto"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Creando reserva…" : isAuthenticated ? "Confirmar reserva" : verifying ? "Enviando código…" : "Verificar y confirmar"}
          </Button>
        </section>

        {submitError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {submitError}
          </p>
        )}
      </form>
    </main>
  );
}
