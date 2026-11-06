"use client";

import React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getEventAttendanceConfirmation,
  submitEventAttendanceConfirmation,
  type EventAttendanceConfirmation,
} from "@/app/shop/lib/groupReservationsApi";
import { ShopFooter } from "@/components/shop/ShopFooter";

export default function EventAttendanceConfirmationPage() {
  const params = useParams<{ slug: string; eventId: string }>();
  const slug = params?.slug ?? "";
  const eventId = params?.eventId ?? "";
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const actionIntent = searchParams?.get("action");
  const [confirmation, setConfirmation] = React.useState<EventAttendanceConfirmation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [declineMode, setDeclineMode] = React.useState(actionIntent === "decline");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [submitError, setSubmitError] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    void getEventAttendanceConfirmation(token)
      .then((data) => {
        if (data.event.id !== Number(eventId) || data.event.slug !== slug) {
          setLoadError(true);
          return;
        }
        setConfirmation(data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [eventId, slug, token]);

  const locale = confirmation?.locale ?? "es";
  const copy = locale === "en"
    ? {
        title: "Attendance confirmation",
        loading: "Loading your event response…",
        invalid: "This confirmation link is invalid or has expired.",
        hello: "Hi",
        question: "Will you attend",
        confirm: "Yes, I will attend",
        decline: "I cannot attend",
        reason: "Reason (optional)",
        reasonPlaceholder: "Share a reason if you would like",
        saveDecline: "Save decline",
        attending: "Your attendance is confirmed.",
        notAttending: "Your response was saved. Your place has been released.",
        notActive: "This booking is no longer active.",
        paidNotice: "Declining releases your place. It does not automatically refund your payment.",
        closed: "The event has started; responses are closed.",
        eventLink: "View event details",
        error: "We could not save your response. Please try again.",
      }
    : {
        title: "Confirmación de asistencia",
        loading: "Cargando tu respuesta…",
        invalid: "Este enlace de confirmación no es válido o ya venció.",
        hello: "Hola",
        question: "¿Asistirás a",
        confirm: "Sí, asistiré",
        decline: "No podré asistir",
        reason: "Motivo (opcional)",
        reasonPlaceholder: "Comparte el motivo si quieres",
        saveDecline: "Guardar respuesta",
        attending: "Tu asistencia está confirmada.",
        notAttending: "Guardamos tu respuesta. El espacio quedó disponible.",
        notActive: "Esta reserva ya no está activa.",
        paidNotice: "Al rechazar se libera tu espacio. El pago no se reembolsa automáticamente.",
        closed: "El evento ya comenzó; las respuestas están cerradas.",
        eventLink: "Ver detalles del evento",
        error: "No pudimos guardar tu respuesta. Inténtalo de nuevo.",
      };

  const submit = async (action: "ATTENDING" | "NOT_ATTENDING") => {
    if (!token) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const result = await submitEventAttendanceConfirmation(token, action, reason.trim() || undefined);
      setConfirmation((current) => current ? { ...current, confirmation_status: result.confirmation_status } : current);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const eventUrl = confirmation
    ? `/shop/${encodeURIComponent(confirmation.event.slug)}/events/${confirmation.event.id}`
    : `/shop/${encodeURIComponent(slug)}/events/${eventId}`;
  const routeMismatch = Boolean(
    confirmation
    && (confirmation.event.id !== Number(eventId) || confirmation.event.slug !== slug),
  );
  const status = confirmation?.confirmation_status;
  const eventStarted = Boolean(confirmation && new Date(confirmation.event.start_at).getTime() <= Date.now());
  const canRespond = status === "PENDING" && confirmation?.booking_status !== "CANCELLED" && !eventStarted;

  return (
    <main className="flex min-h-screen flex-col bg-page text-text-main">
      <section className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-12">
        <article className="w-full space-y-5 rounded-xl border border-surface-border bg-surface p-6 shadow-card">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> {copy.loading}
            </div>
          ) : loadError || !confirmation || routeMismatch ? (
            <p className="text-sm text-rose-700" role="alert">{copy.invalid}</p>
          ) : (
            <>
              <p className="text-sm text-text-muted">{copy.hello} {confirmation.attendee_name},</p>
              <h2 className="text-lg font-medium">{copy.question} <strong>{confirmation.event.title}</strong>?</h2>
              {!confirmation.event.is_free && canRespond ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{copy.paidNotice}</p>
              ) : null}
              {status === "ATTENDING" ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{copy.attending}</p>
              ) : status === "NOT_ATTENDING" ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{copy.notAttending}</p>
              ) : canRespond ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1 bg-brand text-white hover:bg-brand-hover" disabled={submitting} onClick={() => void submit("ATTENDING")}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{copy.confirm}
                    </Button>
                    {!declineMode ? (
                      <Button className="flex-1" variant="outline" disabled={submitting} onClick={() => setDeclineMode(true)}>
                        {copy.decline}
                      </Button>
                    ) : null}
                  </div>
                  {declineMode ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" htmlFor="decline-reason">{copy.reason}</label>
                      <textarea
                        id="decline-reason"
                        className="min-h-24 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
                        maxLength={500}
                        placeholder={copy.reasonPlaceholder}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                      <Button className="w-full" variant="outline" disabled={submitting} onClick={() => void submit("NOT_ATTENDING")}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{copy.saveDecline}
                      </Button>
                    </div>
                  ) : null}
                  {submitError ? <p className="text-sm text-rose-700" role="alert">{copy.error}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-text-muted">{eventStarted ? copy.closed : copy.notActive}</p>
              )}
              <Link className="inline-flex text-sm font-medium text-brand underline-offset-4 hover:underline" href={eventUrl}>
                {copy.eventLink}
              </Link>
            </>
          )}
        </article>
      </section>
      <ShopFooter />
    </main>
  );
}
