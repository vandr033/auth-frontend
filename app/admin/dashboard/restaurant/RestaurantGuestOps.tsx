"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Clock3, Loader2, Plus, RefreshCw, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addRestaurantWaitlist,
  fetchRestaurantDepositProof,
  getRestaurantFinancialMetrics,
  getRestaurantWaitlistRecommendations,
  listRestaurantDeposits,
  listRestaurantWaitlist,
  reviewRestaurantDeposit,
  seatRestaurantWaitlist,
  updateRestaurantWaitlist,
  type RestaurantDeposit,
  type RestaurantFinancialMetrics,
  type RestaurantWaitlist,
} from "@/app/admin/lib/adminApi";
import { notify } from "@/lib/notify";
import { RestaurantCloseoutPanel } from "@/app/admin/dashboard/restaurant/RestaurantCloseoutPanel";

const money = (cents: number, currency = "Bs.") => `${currency} ${(cents / 100).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`;
const message = (error: unknown) => error instanceof Error ? error.message : "No pudimos completar la operación.";
const activeStatuses = new Set<RestaurantWaitlist["status"]>(["WAITING", "NOTIFIED", "ARRIVED"]);
const statusLabel: Record<RestaurantWaitlist["status"], string> = { WAITING: "Esperando", NOTIFIED: "Avisado", ARRIVED: "Llegó", SEATED: "Sentado", LEFT: "Se fue", CANCELLED: "Cancelado" };

export function RestaurantGuestOpsPage() {
  const [waitlist, setWaitlist] = useState<RestaurantWaitlist[]>([]);
  const [deposits, setDeposits] = useState<RestaurantDeposit[]>([]);
  const [metrics, setMetrics] = useState<RestaurantFinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [draft, setDraft] = useState({ guest_name: "", phone: "", party_size: 2 });
  const [recommendations, setRecommendations] = useState<Record<number, { tableId: number | null; combinationId: number | null; label: string } | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [queue, depositResult, financial] = await Promise.all([
        listRestaurantWaitlist({ limit: 50 }),
        listRestaurantDeposits({ status: "PROOF_SUBMITTED", limit: 20 }),
        getRestaurantFinancialMetrics(),
      ]);
      setWaitlist(queue.items.filter((entry) => activeStatuses.has(entry.status)));
      setDeposits(depositResult.items);
      setMetrics(financial);
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!draft.guest_name.trim()) return;
    setBusy(-1);
    try {
      await addRestaurantWaitlist({ guest_name: draft.guest_name.trim(), phone: draft.phone || null, party_size: draft.party_size, source: "WALK_IN" });
      setDraft({ guest_name: "", phone: "", party_size: 2 });
      await load();
      await notify.success("Cliente agregado a la lista de espera.");
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  const suggest = async (entry: RestaurantWaitlist) => {
    setBusy(entry.id);
    try {
      const result = await getRestaurantWaitlistRecommendations();
      const recommendation = result.find((item) => item.waitlist_id === entry.id);
      if (!recommendation) return;
      const tableId = recommendation.recommended_table?.id || null;
      const combinationId = recommendation.recommended_combination?.id || null;
      setRecommendations((previous) => ({
        ...previous,
        [entry.id]: tableId || combinationId
          ? { tableId, combinationId, label: tableId ? `Mesa ${recommendation.recommended_table?.name || `#${tableId}`}` : `Combinación ${recommendation.recommended_combination?.name || `#${combinationId}`}` }
          : null,
      }));
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  const seat = async (entry: RestaurantWaitlist) => {
    const recommendation = recommendations[entry.id];
    if (!recommendation) return;
    setBusy(entry.id);
    try {
      await seatRestaurantWaitlist(entry.id, { table_id: recommendation.tableId, combination_id: recommendation.combinationId });
      await load();
      await notify.success("Cliente sentado y visita iniciada.");
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async (entry: RestaurantWaitlist, status: "NOTIFIED" | "ARRIVED" | "LEFT" | "CANCELLED") => {
    setBusy(entry.id);
    try {
      await updateRestaurantWaitlist(entry.id, { status });
      await load();
      await notify.success(status === "NOTIFIED" ? "Cliente avisado." : status === "ARRIVED" ? "Llegada registrada." : status === "LEFT" ? "Cliente retirado de la espera." : "Espera cancelada.");
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  const reorder = async (entry: RestaurantWaitlist, direction: -1 | 1) => {
    const index = waitlist.findIndex((item) => item.id === entry.id);
    const target = waitlist[index + direction];
    if (!target) return;
    setBusy(entry.id);
    try {
      await updateRestaurantWaitlist(entry.id, { manual_order: target.manual_order });
      await updateRestaurantWaitlist(target.id, { manual_order: entry.manual_order });
      await load();
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  const review = async (deposit: RestaurantDeposit, action: "APPROVE" | "REJECT") => {
    setBusy(deposit.id);
    try {
      await reviewRestaurantDeposit(deposit.id, { action, reason: action === "REJECT" ? "El comprobante no permite validar el depósito." : undefined });
      await load();
      await notify.success(action === "APPROVE" ? "Depósito aprobado." : "Depósito rechazado.");
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  const viewProof = async (deposit: RestaurantDeposit) => {
    setBusy(deposit.id);
    try {
      const url = await fetchRestaurantDepositProof(deposit.id);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      await notify.error(message(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/dashboard/restaurant" className="inline-flex items-center gap-1 text-sm font-medium text-admin-brand hover:underline"><ArrowLeft className="h-4 w-4" />Restaurant Lite</Link>
          <p className="mt-3 text-sm font-medium text-admin-brand">Operación de invitados</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Espera, consumos y depósitos</h1>
          <p className="mt-1 text-sm text-slate-500">Un tablero operativo para el equipo de sala, con importes en unidades menores.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Visitas cerradas" value={metrics?.totals.visits ?? "—"} icon={<Sparkles className="h-4 w-4" />} />
        <Metric label="Ventas registradas" value={metrics ? money(metrics.totals.total_paid_amount_cents) : "—"} icon={<Wallet className="h-4 w-4" />} />
        <Metric label="Propinas" value={metrics ? money(metrics.totals.tip_amount_cents) : "—"} icon={<Check className="h-4 w-4" />} />
        <Metric label="Sin captura financiera" value={metrics?.missing_financial_capture_count ?? "—"} icon={<Clock3 className="h-4 w-4" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Lista de espera</h2><p className="mt-1 text-sm text-slate-500">La estimación es aproximada; la mesa se valida otra vez al sentar.</p></div><Clock3 className="h-5 w-5 text-admin-brand" /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_90px_auto]"><Input placeholder="Nombre" value={draft.guest_name} onChange={(event) => setDraft({ ...draft, guest_name: event.target.value })} /><Input placeholder="WhatsApp" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /><Input type="number" min={1} max={100} value={draft.party_size} onChange={(event) => setDraft({ ...draft, party_size: Number(event.target.value) })} /><Button onClick={() => void add()} disabled={busy === -1 || !draft.guest_name.trim()}><Plus className="mr-2 h-4 w-4" />Agregar</Button></div>
          <div className="mt-5 space-y-2">
            {waitlist.map((entry, index) => <article key={entry.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{entry.guest_name} <span className="font-normal text-slate-500">· {entry.party_size} personas</span></p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{statusLabel[entry.status]}</span></div><p className="mt-1 text-xs text-slate-500">Aproximadamente {entry.estimated_wait_minutes} min{entry.preferred_dining_area?.name ? ` · ${entry.preferred_dining_area.name}` : ""}</p></div>
                <div className="flex flex-wrap justify-end gap-2"><Button size="icon" variant="ghost" aria-label="Subir en la cola" disabled={index === 0 || busy === entry.id} onClick={() => void reorder(entry, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Bajar en la cola" disabled={index === waitlist.length - 1 || busy === entry.id} onClick={() => void reorder(entry, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="sm" variant="outline" disabled={busy === entry.id} onClick={() => void suggest(entry)}><Sparkles className="mr-1 h-3.5 w-3.5" />Sugerir</Button><Button size="sm" disabled={!recommendations[entry.id] || busy === entry.id} onClick={() => void seat(entry)}>Sentar</Button>{entry.status === "WAITING" && <Button size="sm" variant="ghost" disabled={busy === entry.id} onClick={() => void changeStatus(entry, "NOTIFIED")}>Avisar</Button>}{entry.status === "NOTIFIED" && <Button size="sm" variant="ghost" disabled={busy === entry.id} onClick={() => void changeStatus(entry, "ARRIVED")}>Llegó</Button>}<Button size="sm" variant="ghost" disabled={busy === entry.id} onClick={() => void changeStatus(entry, "LEFT")}>Se fue</Button><Button size="sm" variant="ghost" disabled={busy === entry.id} onClick={() => void changeStatus(entry, "CANCELLED")}>Cancelar</Button></div>
              </div>
              {recommendations[entry.id] ? <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{recommendations[entry.id]?.label}</p> : null}
            </article>)}
            {!waitlist.length && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay clientes esperando.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Depósitos por revisar</h2><p className="mt-1 text-sm text-slate-500">El comprobante se abre desde una sesión privada y acotada a la empresa.</p></div><Wallet className="h-5 w-5 text-admin-brand" /></div><div className="mt-5 space-y-3">{deposits.map((deposit) => <article key={deposit.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{deposit.reservation.customer_name}</p><p className="mt-1 text-xs text-slate-500">{deposit.reservation.reservation_code} · {money(deposit.requiredAmountCents, deposit.currency)}</p></div><Button size="sm" variant="ghost" onClick={() => void viewProof(deposit)} disabled={busy === deposit.id}>Ver comprobante</Button></div><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void review(deposit, "APPROVE")} disabled={busy === deposit.id}>Aprobar</Button><Button size="sm" variant="outline" onClick={() => void review(deposit, "REJECT")} disabled={busy === deposit.id}>Rechazar</Button></div></article>)}{!deposits.length && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay comprobantes pendientes.</p>}</div></section>
      </section>

      {metrics && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Ingresos por dimensión</h2><p className="mt-1 text-sm text-slate-500">Solo incluye visitas cerradas o reabiertas con captura financiera.</p><div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3"><Breakdown title="Fecha" items={metrics.by_date} /><Breakdown title="Mesa" items={metrics.by_table} /><Breakdown title="Mozo" items={metrics.by_waiter} /><Breakdown title="Área" items={metrics.by_area} /><Breakdown title="Turno" items={metrics.by_shift} /><Breakdown title="Pago / origen" items={[...(metrics.by_payment_method || []), ...(metrics.by_source || [])]} /></div></section>}
      <RestaurantCloseoutPanel />
      {loading && <div className="flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando operación…</div>}
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{icon}{label}</div><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{value}</p></article>; }

function Breakdown({ title, items }: { title: string; items?: Array<Record<string, unknown>> }) {
  const rows = (items || []).slice(0, 6);
  return <section><h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3><div className="space-y-2">{rows.map((item, index) => <div key={`${String(item.key)}-${index}`} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-600">{String(item.key ?? "Sin dato")}</span><span className="shrink-0 font-semibold tabular-nums text-slate-900">{money(Number(item.total_paid_amount_cents) || 0)}</span></div>)}{!rows.length && <p className="text-xs text-slate-500">Sin datos.</p>}</div></section>;
}
