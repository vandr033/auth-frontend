"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plus, QrCode, Save } from "lucide-react";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveQrScanner } from "@/app/admin/dashboard/group-reservations/components/LiveQrScanner";
import { resolveBackendUrl } from "@/lib/api-url";
import { formatCurrencyFromCents } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { getImageUrl } from "@/utils/image-url";

type PassDuration = "DAY" | "MONTH";
type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
type PaymentStatus = "UNPAID" | "PENDING_CONFIRMATION" | "PAID";

type PassOffering = {
  id: number;
  title: string;
  description: string | null;
  duration: PassDuration;
  price_cents: number;
  is_active: boolean;
  _count?: { reservations: number };
};

type PassReservation = {
  id: number;
  reservation_code: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  selected_date: string;
  valid_from: string;
  valid_until: string;
  price_cents_snapshot: number;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  qr_proof_image_url: string | null;
  qr_token: string;
  qr_image_url: string;
  offering: { title: string; duration: PassDuration };
};

type ScanResult = {
  scan_status: "VALID" | "INVALID";
  reason?: string;
  reservation?: PassReservation;
};

async function adminRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(resolveBackendUrl(`/api/admin/service-passes${path}`), {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.message || "Request failed.");
  return payload.data as T;
}

async function updateOffering(id: number, body: unknown): Promise<PassOffering> {
  const response = await fetch(resolveBackendUrl(`/api/admin/service-passes/offerings/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.message || "Request failed.");
  return payload.data as PassOffering;
}

function dateLabel(value: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: timezone }).format(new Date(value));
}

function validityLabel(reservation: PassReservation, locale: string, timezone: string) {
  const start = dateLabel(reservation.valid_from, locale, timezone);
  const end = dateLabel(new Date(new Date(reservation.valid_until).getTime() - 1).toISOString(), locale, timezone);
  return start === end ? start : `${start} – ${end}`;
}

export default function ServicePassesAdminPage() {
  const { companyUser, isAuthenticated, loading: authLoading } = useAdminAuth();
  const t = useT();
  const [offerings, setOfferings] = useState<PassOffering[]>([]);
  const [reservations, setReservations] = useState<PassReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("offerings");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<PassDuration>("DAY");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const currency = companyUser?.company?.currency;
  const companySlug = companyUser?.company?.slug;
  const companyTimezone = (companyUser?.company as { timezone?: string } | undefined)?.timezone || "UTC";
  const locale = typeof navigator === "undefined" ? "es-BO" : navigator.language;

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [nextOfferings, nextReservations] = await Promise.all([
        adminRequest<PassOffering[]>("/offerings"),
        adminRequest<PassReservation[]>("/reservations"),
      ]);
      setOfferings(nextOfferings);
      setReservations(nextReservations);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("adminPasses.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated) void loadData();
  }, [isAuthenticated, loadData]);

  const publicPath = companySlug ? `/shop/${encodeURIComponent(companySlug)}/passes` : null;
  const pendingCount = useMemo(() => reservations.filter((reservation) => reservation.status === "PENDING").length, [reservations]);

  const openNewOffer = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setDuration("DAY");
    setPrice("");
    setDialogOpen(true);
  };

  const openEditOffer = (offering: PassOffering) => {
    setEditingId(offering.id);
    setName(offering.title);
    setDescription(offering.description ?? "");
    setDuration(offering.duration);
    setPrice((offering.price_cents / 100).toFixed(2));
    setDialogOpen(true);
  };

  const saveOffer = async () => {
    const priceNumber = Number(price || 0);
    if (!name.trim() || !Number.isFinite(priceNumber) || priceNumber < 0) return;
    setSaving(true);
    setPageError(null);
    try {
      const body = {
        title: name.trim(),
        description: description.trim() || null,
        duration,
        price_cents: Math.round(priceNumber * 100),
      };
      if (editingId) await updateOffering(editingId, body);
      else await adminRequest<PassOffering>("/offerings", body);
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("adminPasses.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleOffering = async (offering: PassOffering) => {
    try {
      await updateOffering(offering.id, { is_active: !offering.is_active });
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("adminPasses.saveError"));
    }
  };

  const updateReservation = async (reservation: PassReservation, action: "confirm" | "cancel") => {
    try {
      await adminRequest(`/reservations/${reservation.id}/${action}`, {});
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("adminPasses.loadError"));
    }
  };

  const submitScan = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setScanBusy(true);
    setScanError(null);
    try {
      const scan = await adminRequest<ScanResult>("/reservations/check-in", {
        ...(trimmed.startsWith("gr1.") ? { qr_token: trimmed } : { reservation_code: trimmed }),
      });
      setScanResult(scan);
      setScanCode("");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : t("adminPasses.invalid"));
    } finally {
      setScanBusy(false);
    }
  };

  if (authLoading || loading) {
    return <AdminPageShell><div className="flex min-h-60 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div></AdminPageShell>;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t("adminPasses.title")}
        subtitle={t("adminPasses.subtitle")}
        actions={publicPath ? <Button asChild variant="outline"><Link href={publicPath} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />{t("adminPasses.publicLink")}</Link></Button> : undefined}
      />
      {pageError ? <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pageError}</div> : null}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="offerings">{t("adminPasses.offerings")}</TabsTrigger>
          <TabsTrigger value="reservations">{t("adminPasses.reservations")} {pendingCount ? `(${pendingCount})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="offerings" className="mt-5 space-y-4">
          <div className="flex justify-end"><Button onClick={openNewOffer}><Plus className="mr-2 h-4 w-4" />{t("adminPasses.addOffer")}</Button></div>
          {offerings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-text-muted">{t("adminPasses.noOffers")}</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>{t("adminPasses.name")}</TableHead><TableHead>{t("adminPasses.duration")}</TableHead><TableHead>{t("adminPasses.price")}</TableHead><TableHead>{t("adminPasses.reservations")}</TableHead><TableHead>{t("adminPasses.status")}</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {offerings.map((offering) => (
                      <TableRow key={offering.id}>
                        <TableCell><div className="font-medium">{offering.title}</div>{offering.description ? <p className="max-w-sm truncate text-xs text-text-muted">{offering.description}</p> : null}</TableCell>
                        <TableCell>{offering.duration === "DAY" ? t("adminPasses.day") : t("adminPasses.month")}</TableCell>
                        <TableCell>{formatCurrencyFromCents(offering.price_cents, currency)}</TableCell>
                        <TableCell>{offering._count?.reservations ?? 0}</TableCell>
                        <TableCell><span className={`rounded-full px-2 py-1 text-xs ${offering.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{offering.is_active ? t("adminPasses.active") : t("adminPasses.inactive")}</span></TableCell>
                        <TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openEditOffer(offering)}>{t("common.edit")}</Button><Button size="sm" variant="ghost" onClick={() => void toggleOffering(offering)}>{offering.is_active ? t("adminPasses.inactive") : t("adminPasses.active")}</Button></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="reservations" className="mt-5 space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-4 w-4" />{t("adminPasses.scan")}</CardTitle><p className="text-sm text-text-muted">{t("adminPasses.scanDescription")}</p></CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-2">
              <LiveQrScanner
                onDetected={submitScan}
                disabled={scanBusy}
                title={t("adminPasses.scan")}
                subtitle={t("adminPasses.scanDescription")}
                startLabel={t("adminPasses.scanStart")}
                stopLabel={t("adminPasses.scanStop")}
                unsupportedLabel={t("adminPasses.scanUnsupported")}
                unavailableLabel={t("adminPasses.scanUnavailable")}
                idleLabel={t("adminPasses.scanIdle")}
              />
              <div className="space-y-3">
                <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void submitScan(scanCode); }}>
                  <Input value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder={t("adminPasses.codePlaceholder")} />
                  <Button type="submit" disabled={scanBusy || !scanCode.trim()}>{scanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminPasses.checkCode")}</Button>
                </form>
                {scanError ? <p role="alert" className="text-sm text-red-700">{scanError}</p> : null}
                {scanResult ? (
                  <div className={`rounded-lg border p-4 ${scanResult.scan_status === "VALID" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <p className="font-semibold">{scanResult.scan_status === "VALID" ? t("adminPasses.valid") : t("adminPasses.invalid")}</p>
                    {scanResult.reservation ? <p className="mt-1 text-sm">{scanResult.reservation.customer_name} · {scanResult.reservation.offering.title} · {scanResult.reservation.reservation_code}</p> : null}
                    {scanResult.reason ? <p className="mt-1 text-xs text-text-muted">{scanResult.reason}</p> : null}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
          {reservations.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-text-muted">{t("adminPasses.noReservations")}</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>{t("adminPasses.customer")}</TableHead><TableHead>{t("adminPasses.name")}</TableHead><TableHead>{t("adminPasses.code")}</TableHead><TableHead>{t("adminPasses.validity")}</TableHead><TableHead>{t("adminPasses.payment")}</TableHead><TableHead>{t("adminPasses.status")}</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="min-w-48"><div className="font-medium">{reservation.customer_name}</div><p className="text-xs text-text-muted">{reservation.customer_phone}</p>{reservation.customer_email ? <p className="text-xs text-text-muted">{reservation.customer_email}</p> : null}</TableCell>
                        <TableCell><div>{reservation.offering.title}</div><p className="text-xs text-text-muted">{formatCurrencyFromCents(reservation.price_cents_snapshot, currency)}</p></TableCell>
                        <TableCell><div className="flex items-center gap-2 font-mono text-xs"><span>{reservation.reservation_code}</span><img src={getImageUrl(reservation.qr_image_url) || reservation.qr_image_url} alt="" className="h-10 w-10 rounded border bg-white" /></div></TableCell>
                        <TableCell className="min-w-36"><div>{validityLabel(reservation, locale, companyTimezone)}</div><p className="text-xs text-text-muted">{reservation.offering.duration === "DAY" ? t("adminPasses.day") : t("adminPasses.month")}</p></TableCell>
                        <TableCell><div>{reservation.payment_status === "PAID" ? t("adminPasses.paid") : reservation.payment_status === "PENDING_CONFIRMATION" ? t("adminPasses.awaitingPayment") : t("adminPasses.unpaid")}</div>{reservation.qr_proof_image_url ? <a className="mt-1 block text-xs font-medium text-brand underline" href={getImageUrl(reservation.qr_proof_image_url) || reservation.qr_proof_image_url} target="_blank" rel="noreferrer">{t("adminPasses.viewProof")}</a> : null}</TableCell>
                        <TableCell>{reservation.status === "CONFIRMED" ? t("adminPasses.confirmed") : reservation.status === "CANCELLED" ? t("adminPasses.cancelled") : t("adminPasses.pending")}</TableCell>
                        <TableCell><div className="flex justify-end gap-2">{reservation.status === "PENDING" ? <Button size="sm" onClick={() => void updateReservation(reservation, "confirm")}>{t("adminPasses.confirm")}</Button> : null}{reservation.status !== "CANCELLED" ? <Button size="sm" variant="outline" onClick={() => void updateReservation(reservation, "cancel")}>{t("adminPasses.cancel")}</Button> : null}</div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? t("adminPasses.editOffer") : t("adminPasses.addOffer")}</DialogTitle><DialogDescription>{t("adminPasses.subtitle")}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="pass-offer-name">{t("adminPasses.name")}</Label><Input id="pass-offer-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div>
            <div className="space-y-2"><Label htmlFor="pass-offer-description">{t("adminPasses.description")}</Label><Input id="pass-offer-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <div className="space-y-2"><Label>{t("adminPasses.duration")}</Label><Select value={duration} onValueChange={(value) => setDuration(value as PassDuration)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DAY">{t("adminPasses.day")}</SelectItem><SelectItem value="MONTH">{t("adminPasses.month")}</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="pass-offer-price">{t("adminPasses.price")}</Label><Input id="pass-offer-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={() => void saveOffer()} disabled={saving || !name.trim()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{t("adminPasses.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
