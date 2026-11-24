"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/useAuth";
import { useT } from "@/lib/i18n";
import { formatCurrencyFromCents } from "@/lib/currency";
import { getImageUrl } from "@/utils/image-url";
import { useShop } from "../../contexts/ShopContext";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import { deletePublicUpload, uploadPublicProof } from "../../lib/uploadApi";
import {
  createPublicServicePassReservation,
  getPublicServicePasses,
  type ServicePassOffering,
  type ServicePassPaymentConfig,
  type ServicePassPaymentMethod,
} from "../../lib/servicePassesApi";

function localDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function defaultPaymentMethod(payment: ServicePassPaymentConfig, price: number): ServicePassPaymentMethod {
  if (price === 0) return "NONE";
  if (payment.allow_qr_payment) return "QR";
  if (payment.allow_cash_payment) return "CASH";
  return "NONE";
}

export default function ServicePassesPage() {
  const { company, slug, loading: shopLoading } = useShop();
  const { user } = useAuth();
  const router = useRouter();
  const t = useT();
  const [offerings, setOfferings] = useState<ServicePassOffering[]>([]);
  const [payment, setPayment] = useState<ServicePassPaymentConfig | null>(null);
  const [today, setToday] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ServicePassPaymentMethod>("NONE");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadContextRef = useRef<string | null>(null);
  const selectedOffering = useMemo(
    () => offerings.find((offering) => String(offering.id) === offeringId) ?? null,
    [offerings, offeringId],
  );

  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    getPublicServicePasses(company.id)
      .then((data) => {
        if (!active) return;
        setOfferings(data.offerings);
        setPayment(data.payment);
        const currentDay = localDate(data.company.timezone);
        setToday(currentDay);
        setSelectedDate(currentDay);
        if (data.offerings.length) {
          setOfferingId(String(data.offerings[0].id));
          setPaymentMethod(defaultPaymentMethod(data.payment, data.offerings[0].price_cents));
        }
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : t("shopPasses.unavailable")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [company?.id, t]);

  useEffect(() => {
    if (!user) return;
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.name || "";
    setName((current) => current || fullName);
    setEmail((current) => current || user.email || "");
    setPhone((current) => current || user.phoneNumber || "");
  }, [user]);

  if (shopLoading) {
    return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand" /></main>;
  }
  if (!company) return <ShopUnavailableState />;

  const companyTimezone = company.timezone || "UTC";
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company || !selectedOffering || !payment || !selectedDate || !name.trim() || !phone.trim()) {
      setError(t("shopPasses.selectPass"));
      return;
    }
    const method = selectedOffering.price_cents === 0 ? "NONE" : paymentMethod;
    if (method === "NONE" && selectedOffering.price_cents > 0) {
      setError(t("shopPasses.paymentMethod"));
      return;
    }
    if (method === "QR" && payment.require_comprobante_for_qr && !proofFile) {
      setError(t("shopPasses.uploadProof"));
      return;
    }

    setSubmitting(true);
    setError(null);
    let uploaded: { url: string; deleteToken?: string; contextId?: string | null } | null = null;
    try {
      if (method === "QR" && proofFile) {
        const flowId = uploadContextRef.current ??= (
          typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
        );
        uploaded = await uploadPublicProof({
          file: proofFile,
          slug,
          purpose: "BOOKING_QR_PROOF",
          context: { type: "BOOKING", id: flowId },
        });
      }
      const reservation = await createPublicServicePassReservation({
        company_id: company.id,
        offering_id: selectedOffering.id,
        selected_date: selectedDate,
        customer_name: name.trim(),
        customer_email: email.trim() || undefined,
        customer_phone_prefix: company.phone_prefix || "591",
        customer_phone: phone,
        payment_method: method,
        qr_proof_image_url: uploaded?.url ?? null,
        upload_context_id: uploaded?.contextId ?? null,
      });
      router.push(`/shop/${encodeURIComponent(slug)}/passes/${encodeURIComponent(reservation.reservation_code)}`);
    } catch (requestError) {
      if (uploaded?.url && uploaded.deleteToken) await deletePublicUpload(uploaded.url, uploaded.deleteToken).catch(() => undefined);
      setError(requestError instanceof Error ? requestError.message : t("shopPasses.unavailable"));
    } finally {
      setSubmitting(false);
    }
  };

  const paymentQrUrl = payment?.qr_image_url ? getImageUrl(payment.qr_image_url) : null;

  return (
    <main className="min-h-screen bg-page text-text-main">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        <header className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{company.name}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">{t("shopPasses.title")}</h1>
          <p className="mt-3 text-sm text-text-muted">{t("shopPasses.subtitle")}</p>
        </header>

        {error && offerings.length > 0 ? <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
        ) : error && offerings.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-red-700" role="alert">{error}</CardContent></Card>
        ) : offerings.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-text-muted">{t("shopPasses.noOffers")}</CardContent></Card>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-3" aria-labelledby="pass-options-heading">
              <h2 id="pass-options-heading" className="text-lg font-semibold">{t("shopPasses.selectPass")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {offerings.map((offering) => {
                  const selected = offering.id === selectedOffering?.id;
                  return (
                    <button
                      key={offering.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setOfferingId(String(offering.id));
                        setPaymentMethod(defaultPaymentMethod(payment!, offering.price_cents));
                        setProofFile(null);
                      }}
                      className={`rounded-xl border p-4 text-left transition ${selected ? "border-brand bg-brand-soft-bg ring-1 ring-brand" : "border-surface-border bg-surface hover:border-brand/50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft-bg text-brand"><Ticket className="h-5 w-5" /></span>
                        <span className="text-base font-semibold">{formatCurrencyFromCents(offering.price_cents, company.currency)}</span>
                      </div>
                      <h3 className="mt-4 font-semibold">{offering.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">{offering.duration === "DAY" ? t("shopPasses.day") : t("shopPasses.month")}</p>
                      {offering.description ? <p className="mt-2 text-sm text-text-muted">{offering.description}</p> : null}
                    </button>
                  );
                })}
              </div>

              <Card className="mt-5">
                <CardContent className="space-y-4 p-5">
                  <div className="space-y-2">
                    <Label htmlFor="pass-date">{selectedOffering?.duration === "MONTH" ? t("shopPasses.startsOn") : t("shopPasses.selectDate")}</Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <Input id="pass-date" type="date" min={today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-surface-border pt-4">
                    <h2 className="font-semibold">{t("shopPasses.customerInformation")}</h2>
                    <div className="space-y-2"><Label htmlFor="pass-name">{t("shopPasses.fullName")}</Label><Input id="pass-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="pass-phone">{t("shopPasses.phone")}</Label><Input id="pass-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>
                      <div className="space-y-2"><Label htmlFor="pass-email">{t("shopPasses.email")}</Label><Input id="pass-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <aside>
              <Card className="sticky top-24">
                <CardContent className="space-y-4 p-5">
                  <h2 className="text-lg font-semibold">{t("shopPasses.paymentMethod")}</h2>
                  {selectedOffering?.price_cents === 0 ? (
                    <p className="rounded-lg bg-section p-3 text-sm text-text-muted">{formatCurrencyFromCents(0, company.currency)}</p>
                  ) : (
                    <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ServicePassPaymentMethod)}>
                      <SelectTrigger><SelectValue placeholder={t("shopPasses.paymentMethod")} /></SelectTrigger>
                      <SelectContent>
                        {payment?.allow_cash_payment ? <SelectItem value="CASH">{t("shopPasses.cash")}</SelectItem> : null}
                        {payment?.allow_qr_payment ? <SelectItem value="QR">{t("shopPasses.qr")}</SelectItem> : null}
                      </SelectContent>
                    </Select>
                  )}
                  {paymentMethod === "QR" && paymentQrUrl ? (
                    <div className="space-y-2 rounded-lg bg-section p-3 text-center">
                      <img src={paymentQrUrl} alt={t("shopPasses.qr")} className="mx-auto max-h-48 max-w-full object-contain" />
                      <p className="text-xs text-text-muted">{t("shopPasses.qrInstructions")}</p>
                    </div>
                  ) : null}
                  {paymentMethod === "QR" && payment?.require_comprobante_for_qr ? (
                    <div className="space-y-2">
                      <Label htmlFor="pass-proof">{t("shopPasses.uploadProof")}</Label>
                      <Input id="pass-proof" type="file" accept="image/*,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} required />
                    </div>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={submitting || !selectedOffering || !payment || (selectedOffering.price_cents > 0 && paymentMethod === "NONE")}>
                    {submitting ? t("shopPasses.submitting") : `${t("shopPasses.reserve")} · ${selectedOffering ? formatCurrencyFromCents(selectedOffering.price_cents, company.currency) : ""}`}
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
