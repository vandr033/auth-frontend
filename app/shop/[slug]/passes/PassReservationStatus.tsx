"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Loader2, Ticket, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { useShop } from "../../contexts/ShopContext";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import { getPublicServicePassReservation, type ServicePassReservation } from "../../lib/servicePassesApi";

function formatValidity(reservation: ServicePassReservation, locale: string, timezone: string) {
  const startsAt = new Date(reservation.valid_from);
  const lastValidAt = new Date(new Date(reservation.valid_until).getTime() - 1);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: timezone });
  const start = formatter.format(startsAt);
  const end = formatter.format(lastValidAt);
  return start === end ? start : `${start} – ${end}`;
}

export function PassReservationStatus({ code }: { code: string }) {
  const { company, slug, loading: shopLoading } = useShop();
  const t = useT();
  const [reservation, setReservation] = useState<ServicePassReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    getPublicServicePassReservation(company.id, code)
      .then((result) => active && setReservation(result))
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : t("shopPasses.unavailable")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [code, company?.id, t]);

  if (shopLoading || loading) {
    return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand" /></main>;
  }
  if (!company) return <ShopUnavailableState slug={slug} />;

  const confirmed = reservation?.status === "CONFIRMED";
  const cancelled = reservation?.status === "CANCELLED";
  return (
    <main className="min-h-[70vh] bg-page px-4 py-12 text-text-main">
      <div className="mx-auto max-w-xl">
        {reservation ? (
          <Card>
            <CardContent className="space-y-5 p-6 text-center sm:p-8">
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${confirmed ? "bg-emerald-100 text-emerald-700" : cancelled ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {confirmed ? <CheckCircle2 className="h-7 w-7" /> : cancelled ? <XCircle className="h-7 w-7" /> : <Ticket className="h-7 w-7" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{confirmed ? t("shopPasses.reservationTitle") : cancelled ? t("shopPasses.cancelledTitle") : t("shopPasses.pendingTitle")}</h1>
                <p className="mt-2 text-sm text-text-muted">{confirmed ? t("shopPasses.confirmedDescription") : cancelled ? t("shopPasses.cancelledDescription") : t("shopPasses.pendingDescription")}</p>
              </div>
              {!cancelled ? <div className="mx-auto max-w-[220px] rounded-xl border border-surface-border bg-white p-3">
                {/* The QR image is served by the signed ticket QR provider. */}
                <img src={reservation.qr_image_url} alt={t("shopPasses.reservationCode")} className="aspect-square w-full object-contain" />
              </div> : null}
              <div className="rounded-xl bg-section p-4 text-left">
                <p className="text-xs uppercase tracking-wide text-text-muted">{reservation.offering.title}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-text-muted">{t("shopPasses.reservationCode")}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="break-all font-mono text-xl font-semibold tracking-wider">{reservation.reservation_code}</p>
                  <Button type="button" size="icon" variant="outline" aria-label={t("shopPasses.reservationCode")} onClick={() => {
                    void navigator.clipboard?.writeText(reservation.reservation_code).then(() => setCopied(true));
                  }}><Copy className="h-4 w-4" /></Button>
                </div>
                {copied ? <p className="mt-1 text-xs text-emerald-700">{t("common.copied")}</p> : null}
                <p className="mt-3 text-xs uppercase tracking-wide text-text-muted">{t("shopPasses.validity")}</p>
                <p className="mt-1 font-medium">{formatValidity(reservation, typeof navigator !== "undefined" ? navigator.language : "es", company.timezone || "UTC")}</p>
              </div>
              <Button asChild variant="outline" className="w-full"><Link href={`/shop/${encodeURIComponent(slug)}`}>{t("shopPasses.backToShop")}</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="space-y-4 py-10 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><Button asChild variant="outline"><Link href={`/shop/${encodeURIComponent(slug)}`}>{t("shopPasses.backToShop")}</Link></Button></CardContent></Card>
        )}
      </div>
    </main>
  );
}
