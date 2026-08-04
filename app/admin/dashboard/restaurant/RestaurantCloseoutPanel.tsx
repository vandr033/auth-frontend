"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileCheck2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchRestaurantCloseoutExport, finalizeRestaurantCloseout, closeRestaurantCloseout, getRestaurantCloseout, listRestaurantCloseouts, listRestaurantShifts, previewRestaurantCloseout, type RestaurantShift, type RestaurantShiftCloseout } from "@/app/admin/lib/adminApi";
import { notify } from "@/lib/notify";

const today = () => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const money = (value: unknown, currency = "Bs.") => `${currency} ${Number(value || 0) / 100}`;
const message = (error: unknown) => error instanceof Error ? error.message : "No pudimos completar el cierre.";

type Preview = { shift: RestaurantShift; snapshot: Record<string, unknown> };

export function RestaurantCloseoutPanel() {
  const [shifts, setShifts] = useState<RestaurantShift[]>([]);
  const [closeouts, setCloseouts] = useState<RestaurantShiftCloseout[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [closeout, setCloseout] = useState<RestaurantShiftCloseout | null>(null);
  const [notes, setNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const [shiftRows, closeoutRows] = await Promise.all([listRestaurantShifts({ dateFrom: today(), dateTo: today() }), listRestaurantCloseouts({ limit: 20 })]);
      setShifts(shiftRows);
      setCloseouts(closeoutRows);
      setSelectedShiftId((current) => current || shiftRows[0]?.id || closeoutRows[0]?.shift_id || null);
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setLoading(false);
    }
  };

  const inspect = useCallback(async (shiftId: number) => {
    setBusy(true);
    try {
      const existing = closeouts.find((item) => item.shift_id === shiftId);
      if (existing) setCloseout(await getRestaurantCloseout(shiftId));
      else setCloseout(null);
      setPreview(await previewRestaurantCloseout(shiftId));
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(false);
    }
  }, [closeouts]);

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selectedShiftId && !preview) void inspect(selectedShiftId); }, [selectedShiftId, preview, inspect]);

  const warnings = useMemo(() => Array.isArray(preview?.snapshot?.missing_data_warnings) ? preview.snapshot.missing_data_warnings.map(String) : [], [preview]);
  const revenue = (preview?.snapshot?.revenue_summary || closeout?.revenue_summary || {}) as Record<string, unknown>;
  const selectedShift = shifts.find((item) => item.id === selectedShiftId) || preview?.shift || closeout?.shift;

  const close = async () => {
    if (!selectedShiftId) return;
    if (warnings.length && !overrideReason.trim()) { await notify.error("Este turno tiene advertencias. Indicá el motivo de la excepción para cerrarlo."); return; }
    setBusy(true);
    try { setCloseout(await closeRestaurantCloseout(selectedShiftId, { manager_notes: notes || null, override_warnings: warnings.length > 0, override_reason: overrideReason || null })); await load(); await notify.success("Cierre operativo guardado."); } catch (error) { await notify.error(message(error)); } finally { setBusy(false); }
  };
  const finalize = async () => { if (!selectedShiftId) return; setBusy(true); try { setCloseout(await finalizeRestaurantCloseout(selectedShiftId)); await load(); await notify.success("Cierre finalizado."); } catch (error) { await notify.error(message(error)); } finally { setBusy(false); } };
  const exportReport = async () => { if (!selectedShiftId) return; setBusy(true); try { const url = await fetchRestaurantCloseoutExport(selectedShiftId); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `restaurant-closeout-${selectedShiftId}.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (error) { await notify.error(message(error)); } finally { setBusy(false); } };

  if (loading) return <section className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Cargando cierres…</section>;
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-admin-brand">Control de turno</p><h2 className="mt-1 text-lg font-bold text-slate-950">Cierre operativo</h2><p className="mt-1 text-sm text-slate-500">Revisa advertencias antes de fijar el resumen del turno.</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></header>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="space-y-1 text-sm font-medium text-slate-700"><span>Turno</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3" value={selectedShiftId || ""} onChange={(event) => { const id = Number(event.target.value); setPreview(null); setSelectedShiftId(id || null); }}><option value="">Seleccionar turno</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} · {new Date(shift.start_at).toLocaleDateString("es-BO")}</option>)}{closeouts.filter((item) => !shifts.some((shift) => shift.id === item.shift_id)).map((item) => <option key={`closeout-${item.shift_id}`} value={item.shift_id}>Cierre #{item.shift_id} · {item.status}</option>)}</select></label>{selectedShift && <div className="flex items-end"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{selectedShift.status}</span></div>}</div>
    {selectedShiftId && <><div className="grid gap-3 sm:grid-cols-3"><Metric label="Ventas" value={money(revenue.total_paid_amount_cents, String(revenue.currency || "Bs."))}/><Metric label="Propinas" value={money((preview?.snapshot?.tip_summary as Record<string, unknown> | undefined)?.tip_amount_cents, String(revenue.currency || "Bs."))}/><Metric label="Advertencias" value={warnings.length}/></div>{warnings.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Pendientes antes del cierre</p><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.slice(0, 8).map((warning) => <li key={warning}>{warning}</li>)}{warnings.length > 8 && <li>+ {warnings.length - 8} más</li>}</ul></div>}<div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium text-slate-700"><span>Notas del gerente</span><Input value={notes} maxLength={4000} onChange={(event) => setNotes(event.target.value)}/></label><label className="space-y-1 text-sm font-medium text-slate-700"><span>Motivo de excepción {warnings.length ? "(obligatorio)" : "(opcional)"}</span><Input value={overrideReason} maxLength={500} onChange={(event) => setOverrideReason(event.target.value)}/></label></div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void exportReport()} disabled={busy}><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>{closeout?.status === "CLOSED" || closeout?.status === "REOPENED" ? <Button onClick={() => void finalize()} disabled={busy}><FileCheck2 className="mr-2 h-4 w-4"/>Finalizar cierre</Button> : <Button onClick={() => void close()} disabled={busy || !preview}>{busy ? "Guardando…" : "Cerrar turno"}</Button>}</div></>}
    {!shifts.length && !closeouts.length && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay turnos para revisar hoy.</p>}
    <Link href="/admin/dashboard/restaurant/shifts" className="inline-block text-xs font-semibold text-admin-brand hover:underline">Administrar turnos →</Link>
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-950">{value}</p></div>; }
