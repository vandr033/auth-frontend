"use client";

import { useState } from "react";
import { Check, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { saveMyRestaurantVisit, saveRestaurantVisit, type RestaurantVisitPaymentMethod } from "@/app/admin/lib/adminApi";

type CaptureProps = {
  reservationId?: number | null;
  tableId: number;
  guestCount: number;
  mode: "manager" | "waiter";
  onSaved: () => void;
  onCancel: () => void;
};

const paymentMethods: Array<[RestaurantVisitPaymentMethod, string]> = [["CASH", "Efectivo"], ["CARD", "Tarjeta"], ["QR", "QR"], ["TRANSFER", "Transferencia"], ["MIXED", "Mixto"], ["OTHER", "Otro"]];
const mixedMethods: Array<[string, string]> = [["CASH", "Efectivo"], ["CARD", "Tarjeta"], ["QR", "QR"], ["TRANSFER", "Transferencia"]];

/** Parse a two-decimal amount without floating-point arithmetic. */
function toMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

export function RestaurantVisitCapture({ reservationId, tableId, guestCount, mode, onSaved, onCancel }: CaptureProps) {
  const [guests, setGuests] = useState(String(guestCount || 1));
  const [subtotal, setSubtotal] = useState("0.00");
  const [discount, setDiscount] = useState("0.00");
  const [tip, setTip] = useState("0.00");
  const [total, setTotal] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<RestaurantVisitPaymentMethod>("CASH");
  const [mixed, setMixed] = useState<Record<string, string>>({ CASH: "0.00", CARD: "0.00", QR: "0.00", TRANSFER: "0.00" });
  const [posReference, setPosReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (complete: boolean) => {
    const guestCountValue = Number(guests);
    const subtotalCents = toMinor(subtotal);
    const discountCents = toMinor(discount);
    const tipCents = toMinor(tip);
    const totalCents = toMinor(total);
    if (!Number.isInteger(guestCountValue) || guestCountValue < 1 || subtotalCents === null || discountCents === null || tipCents === null || totalCents === null || discountCents > subtotalCents) {
      await notify.error("Revisá comensales e importes. El descuento no puede superar el subtotal.");
      return;
    }
    const breakdown = paymentMethod === "MIXED" ? Object.fromEntries(mixedMethods.map(([key]) => [key, toMinor(mixed[key] || "0.00") ?? -1])) : null;
    if (paymentMethod === "MIXED" && Object.values(breakdown || {}).some((value) => value < 0 || !Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)) {
      await notify.error("Revisá los importes del pago mixto.");
      return;
    }
    if (complete && !window.confirm("¿Cerrar esta mesa y liberar su capacidad?")) return;
    setBusy(true);
    try {
      const input = { reservation_id: reservationId || undefined, table_id: tableId, guest_count: guestCountValue, subtotal_amount_cents: subtotalCents, discount_amount_cents: discountCents, tip_amount_cents: tipCents, total_paid_amount_cents: totalCents, payment_method: paymentMethod, mixed_payment_breakdown: breakdown, pos_reference: posReference || null, closing_notes: notes || null, complete };
      if (mode === "waiter") await saveMyRestaurantVisit(input);
      else await saveRestaurantVisit(input);
      await notify.success(complete ? "Mesa cerrada y consumo registrado." : "Borrador de consumo guardado.");
      onSaved();
    } catch (error) {
      await notify.error(error instanceof Error ? error.message : "No pudimos guardar el consumo.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5"><section className="max-h-[94svh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"><header className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-admin-brand">Cierre de mesa</p><h2 className="mt-1 text-xl font-bold text-slate-950">Registrar consumo</h2><p className="mt-1 text-sm text-slate-500">Importes en unidades monetarias; se guardan en centavos sin redondeos intermedios.</p></div><Button size="icon" variant="ghost" onClick={onCancel} aria-label="Cerrar"><X className="h-5 w-5"/></Button></header><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium text-slate-700"><span>Comensales</span><Input type="number" min={1} max={100} inputMode="numeric" value={guests} onChange={(event) => setGuests(event.target.value)}/></label><label className="space-y-1 text-sm font-medium text-slate-700"><span>Método de pago</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as RestaurantVisitPaymentMethod)}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{[["Subtotal", subtotal, setSubtotal], ["Descuento", discount, setDiscount], ["Propina", tip, setTip], ["Total pagado", total, setTotal]].map(([label, value, setter]) => <label key={String(label)} className="space-y-1 text-sm font-medium text-slate-700"><span>{String(label)} · 2 decimales</span><Input type="number" min="0" step="0.01" inputMode="decimal" value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)}/></label>)}</div>{paymentMethod === "MIXED" && <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-semibold text-slate-900">Desglose de pago mixto</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{mixedMethods.map(([key, label]) => <label key={key} className="space-y-1 text-sm text-slate-700"><span>{label}</span><Input type="number" min="0" step="0.01" inputMode="decimal" value={mixed[key]} onChange={(event) => setMixed((current) => ({ ...current, [key]: event.target.value }))}/></label>)}</div></section>}<div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm text-slate-700"><span>Referencia POS (opcional)</span><Input maxLength={160} value={posReference} onChange={(event) => setPosReference(event.target.value)}/></label><label className="space-y-1 text-sm text-slate-700"><span>Notas de cierre</span><Input maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)}/></label></div><div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={busy}>Cancelar</Button><Button variant="secondary" onClick={() => void submit(false)} disabled={busy}><Save className="mr-2 h-4 w-4"/>Guardar borrador</Button><Button onClick={() => void submit(true)} disabled={busy}><Check className="mr-2 h-4 w-4"/>Cerrar mesa</Button></div></section></div>;
}
