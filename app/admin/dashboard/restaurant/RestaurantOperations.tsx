"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Eye, FileText, Filter, LayoutGrid, List, Loader2, Pencil, Plus, RotateCcw, UserRoundCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { getImageUrl } from "@/utils/image-url";
import { createRestaurantReservation, getRestaurantDashboard, getRestaurantReservation, listRestaurantReservations, listRestaurantTables, type RestaurantDashboard, type RestaurantReservation, type RestaurantReservationSource, type RestaurantReservationStatus, type RestaurantTable, updateRestaurantReservation, updateRestaurantReservationStatus } from "@/app/admin/lib/adminApi";

const labels: Record<RestaurantReservationStatus, string> = { PENDING: "Pendiente", CONFIRMED: "Confirmada", ARRIVED: "Llegó", SEATED: "Sentada", COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No se presentó" };
const sourceLabels: Record<RestaurantReservationSource, string> = { ADMIN: "Administración", PHONE: "Teléfono", WHATSAPP: "WhatsApp", WALK_IN: "Walk-in", ONLINE: "Online" };
const transitions: Record<RestaurantReservationStatus, Array<[RestaurantReservationStatus, string]>> = { PENDING: [["CONFIRMED", "Confirmar"], ["CANCELLED", "Cancelar"]], CONFIRMED: [["ARRIVED", "Marcar llegada"], ["CANCELLED", "Cancelar"], ["NO_SHOW", "No-show"]], ARRIVED: [["SEATED", "Sentar"], ["CANCELLED", "Cancelar"], ["NO_SHOW", "No-show"]], SEATED: [["COMPLETED", "Completar"], ["CANCELLED", "Cancelar"]], COMPLETED: [], CANCELLED: [], NO_SHOW: [] };
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "No pudimos completar la operación."; }
function localDate() { return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function time(value: string) { return new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export function RestaurantDashboardPage() {
  const [data, setData] = useState<RestaurantDashboard | null>(null); const [error, setError] = useState<string | null>(null);
  const load = async () => { try { setError(null); setData(await getRestaurantDashboard()); } catch (e) { setError(errorMessage(e)); } };
  useEffect(() => { void load(); }, []);
  if (!data && !error) return <Loading />; if (error) return <Failure message={error} retry={load} />; if (!data) return null;
  const groups = new Map<string, typeof data.tables>(); data.tables.forEach((table) => { const key = table.dining_area?.name || "Sin área"; groups.set(key, [...(groups.get(key) || []), table]); });
  return <main className="mx-auto max-w-7xl space-y-8 pb-10"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-admin-brand">Restaurant Lite</p><h1 className="text-2xl font-bold tracking-tight text-slate-950">Operación de hoy</h1></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/admin/dashboard/restaurant/reservations">Ver reservas</Link></Button><Button asChild><Link href="/admin/dashboard/restaurant/reservations/new"><Plus className="mr-2 h-4 w-4"/>Nueva reserva</Link></Button><Button asChild variant="secondary"><Link href="/admin/dashboard/restaurant/reservations/new?walkIn=1"><UserRoundCheck className="mr-2 h-4 w-4"/>Registrar walk-in</Link></Button></div></header><section className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">{[["Reservas hoy", data.summary.reservations_today], ["Comensales esperados", data.summary.guests_expected_today], ["Pendientes", data.summary.pending], ["Confirmadas", data.summary.confirmed], ["Llegaron", data.summary.arrived], ["Sentadas", data.summary.seated], ["Mesas disponibles", data.summary.available_tables], ["Mesas ocupadas", data.summary.blocked_tables]].map(([label, value]) => <div key={String(label)} className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>)}</section><section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-6">{[...groups].map(([area, tables]) => <div key={area}><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">{area}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tables.map((table) => <article key={table.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between"><strong>{table.name}</strong><span className="text-xs font-semibold text-slate-500">{table.maximum_seats} personas</span></div><p className="mt-4 text-sm font-medium text-slate-800">{table.operational_status === "AVAILABLE" ? "Disponible" : labels[table.operational_status as RestaurantReservationStatus] || table.operational_status}</p>{table.current_reservation ? <Link className="mt-2 block text-sm text-admin-brand hover:underline" href={`/admin/dashboard/restaurant/reservations/${table.current_reservation.id}`}>{table.current_reservation.customer_name} · {table.current_reservation.party_size} personas</Link> : table.next_reservation ? <Link className="mt-2 block text-sm text-slate-500 hover:underline" href={`/admin/dashboard/restaurant/reservations/${table.next_reservation.id}`}>Próxima: {time(table.next_reservation.start_time)}</Link> : <p className="mt-2 text-sm text-slate-400">Sin reservas próximas</p>}</article>)}</div></div>)}</div><aside className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-950">Próximas reservas</h2><div className="mt-3 divide-y divide-slate-100">{data.upcoming_reservations.length ? data.upcoming_reservations.map((r) => <Link key={r.id} href={`/admin/dashboard/restaurant/reservations/${r.id}`} className="block py-3 text-sm hover:bg-slate-50"><span className="font-semibold">{time(r.start_time)}</span> · {r.customer_name}<span className="block text-xs text-slate-500">{r.party_size} personas · {labels[r.status]}</span></Link>) : <p className="py-5 text-sm text-slate-500">No hay reservas hoy.</p>}</div></aside></section></main>;
}

export function RestaurantReservationsPage() {
  const [items, setItems] = useState<RestaurantReservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [date, setDate] = useState(localDate());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RestaurantReservationStatus | "">("");
  const [source, setSource] = useState<RestaurantReservationSource | "">("");
  const [diningAreaId, setDiningAreaId] = useState("");
  const [tableId, setTableId] = useState("");
  const [view, setView] = useState<"list" | "floor">("list");
  const [floorTime, setFloorTime] = useState(new Date().toTimeString().slice(0, 5));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [reservations, allTables] = await Promise.all([
        listRestaurantReservations({ date, search, status, source, diningAreaId, tableId, limit: 100 }),
        listRestaurantTables(),
      ]);
      setItems(reservations.items);
      setTables(allTables);
    } catch (e) {
      await notify.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [date]);

  const action = async (item: RestaurantReservation, nextStatus: RestaurantReservationStatus) => {
    const reason = nextStatus === "CANCELLED" ? window.prompt("Motivo de cancelación") || undefined : undefined;
    try {
      await updateRestaurantReservationStatus(item.id, nextStatus, reason);
      await load();
    } catch (e) {
      await notify.error(errorMessage(e));
    }
  };

  const reset = () => {
    setSearch(""); setStatus(""); setSource(""); setDiningAreaId(""); setTableId("");
    window.setTimeout(() => void load(), 0);
  };
  const areas = Array.from(new Map(tables.filter((table) => table.dining_area).map((table) => [table.dining_area!.id, table.dining_area!])).values());
  const visibleTables = tables.filter((table) => !diningAreaId || table.dining_area_id === Number(diningAreaId)).filter((table) => !tableId || table.id === Number(tableId));
  const selectedMoment = new Date(`${date}T${floorTime}:00`);
  const blocking = new Set<RestaurantReservationStatus>(["PENDING", "CONFIRMED", "ARRIVED", "SEATED"]);
  const occupiedTableIds = new Set(items.filter((item) => blocking.has(item.status) && item.table && new Date(item.start_time) <= selectedMoment && new Date(item.end_time) > selectedMoment).map((item) => item.table!.id));
  const activeVisibleTables = visibleTables.filter((table) => table.is_active && table.dining_area?.is_active !== false);
  const groupedTables = new Map<string, RestaurantTable[]>();
  activeVisibleTables.forEach((table) => {
    const area = table.dining_area?.name || "Sin área";
    groupedTables.set(area, [...(groupedTables.get(area) || []), table]);
  });

  return <main className="mx-auto max-w-7xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-admin-brand">Restaurant Lite</p>
        <h1 className="text-2xl font-bold text-slate-950">Reservas</h1>
        <p className="mt-1 text-sm text-slate-500">Gestioná el servicio, la ocupación y los cambios de cada mesa.</p>
      </div>
      <Button asChild><Link href="/admin/dashboard/restaurant/reservations/new"><Plus className="mr-2 h-4 w-4"/>Nueva reserva</Link></Button>
    </header>

    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter className="h-4 w-4 text-admin-brand"/>Filtros de servicio</div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}><List className="mr-1.5 h-4 w-4"/>Lista</Button>
          <Button size="sm" variant={view === "floor" ? "default" : "ghost"} onClick={() => setView("floor")}><LayoutGrid className="mr-1.5 h-4 w-4"/>Plano operativo</Button>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Fecha</span><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Buscar</span><Input placeholder="Cliente, teléfono o código" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} /></label>
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Estado</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as RestaurantReservationStatus | "")}>{<><option value="">Todos los estados</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</>}</select></label>
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Origen</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={source} onChange={(event) => setSource(event.target.value as RestaurantReservationSource | "")}><option value="">Todos los orígenes</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Área</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={diningAreaId} onChange={(event) => { setDiningAreaId(event.target.value); setTableId(""); }}><option value="">Todas las áreas</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Mesa</span><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={tableId} onChange={(event) => setTableId(event.target.value)}><option value="">Todas las mesas</option>{tables.filter((table) => !diningAreaId || table.dining_area_id === Number(diningAreaId)).map((table) => <option key={table.id} value={table.id}>{table.dining_area?.name} · {table.name}</option>)}</select></label>
        <div className="flex items-end gap-2 xl:col-span-2"><Button onClick={() => void load()}>Aplicar filtros</Button><Button variant="outline" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4"/>Limpiar</Button></div>
      </div>
    </section>

    {loading ? <Loading /> : view === "list" ? <>
      <section className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3"><div className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reservas encontradas</p><p className="mt-1 text-2xl font-bold text-slate-950">{items.length}</p></div><div className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Comensales</p><p className="mt-1 text-2xl font-bold text-slate-950">{items.reduce((sum, item) => sum + item.party_size, 0)}</p></div><div className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mesas con reserva</p><p className="mt-1 text-2xl font-bold text-slate-950">{new Set(items.map((item) => item.table?.id).filter(Boolean)).size}</p></div></section>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[940px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Horario</th><th>Cliente</th><th>Grupo</th><th>Estado</th><th>Mesa / área</th><th>Origen</th><th>Código</th><th className="p-3">Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="p-3 font-medium text-slate-900">{time(item.start_time)}<span className="mt-0.5 block text-xs font-normal text-slate-500">hasta {time(item.end_time)}</span></td><td><Link className="font-medium hover:text-admin-brand hover:underline" href={`/admin/dashboard/restaurant/reservations/${item.id}`}>{item.customer_name}<span className="mt-0.5 block text-xs font-normal text-slate-500">{item.customer_phone || item.customer_email || "Sin contacto"}</span></Link></td><td><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400"/>{item.party_size}</span></td><td><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{labels[item.status]}</span></td><td>{item.table ? <><span className="font-medium">{item.table.name}</span><span className="block text-xs text-slate-500">{item.table.dining_area?.name || "Sin área"}</span></> : "Sin asignar"}</td><td className="text-slate-600">{sourceLabels[item.source]}</td><td className="font-mono text-xs text-slate-600">{item.reservation_code}</td><td className="p-3"><div className="flex flex-wrap gap-1"><Button asChild size="sm" variant="outline"><Link href={`/admin/dashboard/restaurant/reservations/${item.id}/edit`}><Pencil className="mr-1 h-3.5 w-3.5"/>Editar</Link></Button>{transitions[item.status].map(([nextStatus, label]) => <Button key={nextStatus} size="sm" variant="outline" onClick={() => void action(item, nextStatus)}>{label}</Button>)}</div></td></tr>)}{!items.length && <tr><td className="p-10 text-center text-slate-500" colSpan={8}>No hay reservas que coincidan con los filtros.</td></tr>}</tbody></table></div>
    </> : <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div><div className="flex items-center gap-2 font-semibold text-slate-950"><CalendarDays className="h-4 w-4 text-admin-brand"/>Ocupación por mesa</div><p className="mt-1 text-sm text-slate-500">Elegí un horario para ver qué mesa está ocupada y quién la tiene asignada.</p></div><label className="space-y-1"><span className="text-xs font-medium text-slate-600">Hora a consultar</span><Input className="w-40" type="time" value={floorTime} onChange={(event) => setFloorTime(event.target.value)} /></label></div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3"><div className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mesas activas</p><p className="mt-1 text-2xl font-bold text-slate-950">{activeVisibleTables.length}</p></div><div className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ocupadas a las {floorTime}</p><p className="mt-1 text-2xl font-bold text-slate-950">{occupiedTableIds.size}</p></div><div className="bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Disponibles a las {floorTime}</p><p className="mt-1 text-2xl font-bold text-emerald-700">{Math.max(0, activeVisibleTables.length - occupiedTableIds.size)}</p></div></div>
      {[...groupedTables].map(([area, areaTables]) => <section key={area} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">{area}</h2><p className="text-xs text-slate-500">{areaTables.length} {areaTables.length === 1 ? "mesa" : "mesas"}</p></div><span className="text-xs text-slate-500">Vista operativa · no representa la posición física</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{areaTables.map((table) => { const reservations = items.filter((item) => item.table?.id === table.id); const current = reservations.find((item) => blocking.has(item.status) && new Date(item.start_time) <= selectedMoment && new Date(item.end_time) > selectedMoment); return <article key={table.id} className={`rounded-xl border p-4 ${current ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/40"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{table.name}</h3><p className="text-xs text-slate-500">Hasta {table.maximum_seats} personas</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${current ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{current ? "Ocupada" : "Disponible"}</span></div>{current ? <Link href={`/admin/dashboard/restaurant/reservations/${current.id}`} className="mt-4 block rounded-lg border border-amber-200 bg-white p-3 text-sm hover:border-admin-brand"><span className="font-semibold text-slate-900">{current.customer_name}</span><span className="mt-1 block text-slate-600">{time(current.start_time)} – {time(current.end_time)} · {current.party_size} personas</span></Link> : <p className="mt-4 rounded-lg border border-dashed border-emerald-200 px-3 py-3 text-sm text-emerald-800">Libre a las {floorTime}</p>}<div className="mt-3 space-y-1.5">{reservations.filter((item) => item !== current).slice(0, 3).map((item) => <Link key={item.id} href={`/admin/dashboard/restaurant/reservations/${item.id}`} className="flex justify-between rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-white"><span>{time(item.start_time)} · {item.customer_name}</span><span>{labels[item.status]}</span></Link>)}{reservations.length > (current ? 1 : 0) + 3 && <p className="px-2 text-xs text-slate-500">+ {reservations.length - (current ? 1 : 0) - 3} más</p>}</div></article>; })}</div></section>)}
      {!activeVisibleTables.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No hay mesas activas que coincidan con los filtros.</div>}
      <p className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"/>La disponibilidad usa las reservas pendientes, confirmadas, llegadas y sentadas. Las canceladas, completadas y no-show liberan la mesa.</p>
    </section>}</main>;
}

export function RestaurantReservationForm({ reservationId, walkIn = false }: { reservationId?: number; walkIn?: boolean }) { const [tables, setTables] = useState<RestaurantTable[]>([]); const [saving, setSaving] = useState(false); const [draft, setDraft] = useState<Record<string, string | number | boolean | null>>({ source: walkIn ? "WALK_IN" : "ADMIN", customer_name: "", customer_phone: "", customer_email: "", party_size: 2, reservation_date: localDate(), reservation_time: new Date().toTimeString().slice(0, 5), table_id: null, auto_assign: true, notes: "", internal_notes: "", initial_status: walkIn ? "ARRIVED" : "CONFIRMED" }); useEffect(() => { void Promise.all([listRestaurantTables(), reservationId ? getRestaurantReservation(reservationId) : Promise.resolve(null)]).then(([allTables, reservation]) => { setTables(allTables); if (reservation) setDraft({ customer_name: reservation.customer_name, customer_phone: reservation.customer_phone || "", customer_email: reservation.customer_email || "", party_size: reservation.party_size, reservation_date: reservation.start_time.slice(0, 10), reservation_time: new Date(reservation.start_time).toTimeString().slice(0, 5), table_id: reservation.table?.id || null, auto_assign: false, notes: reservation.notes || "", internal_notes: reservation.internal_notes || "", source: reservation.source, initial_status: reservation.status }); }).catch((e) => void notify.error(errorMessage(e))); }, [reservationId]); const submit = async (e: FormEvent) => { e.preventDefault(); setSaving(true); try { const saved = reservationId ? await updateRestaurantReservation(reservationId, draft) : await createRestaurantReservation(draft); window.location.assign(`/admin/dashboard/restaurant/reservations/${saved.id}`); } catch (error) { await notify.error(errorMessage(error)); } finally { setSaving(false); } }; return <main className="mx-auto max-w-3xl pb-10"><header className="mb-6"><p className="text-sm font-medium text-admin-brand">Restaurant Lite</p><h1 className="text-2xl font-bold text-slate-950">{reservationId ? "Editar reserva" : walkIn ? "Registrar walk-in" : "Nueva reserva"}</h1></header><form onSubmit={submit} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">{[["customer_name", "Cliente", "text"], ["customer_phone", "Teléfono", "tel"], ["customer_email", "Correo", "email"], ["party_size", "Comensales", "number"], ["reservation_date", "Fecha", "date"], ["reservation_time", "Hora", "time"]].map(([key, label, type]) => <label key={key} className="space-y-1.5"><span className="text-sm font-medium">{label}</span><Input required={key === "customer_name"} type={type} min={key === "party_size" ? 1 : undefined} value={String(draft[key] ?? "")} onChange={(e) => setDraft({ ...draft, [key]: type === "number" ? Number(e.target.value) : e.target.value })}/></label>)}<label className="space-y-1.5"><span className="text-sm font-medium">Origen</span><select className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={String(draft.source)} disabled={Boolean(reservationId)} onChange={(e) => setDraft({ ...draft, source: e.target.value })}>{(["ADMIN", "PHONE", "WHATSAPP", "WALK_IN"] as const).map((source) => <option key={source}>{sourceLabels[source]}</option>)}</select></label><label className="space-y-1.5"><span className="text-sm font-medium">Mesa</span><select className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={draft.auto_assign ? "auto" : String(draft.table_id || "")} onChange={(e) => setDraft({ ...draft, auto_assign: e.target.value === "auto", table_id: e.target.value === "auto" ? null : Number(e.target.value) })}><option value="auto">Asignación automática</option>{tables.map((table) => <option disabled={!table.is_active || table.maximum_seats < Number(draft.party_size)} key={table.id} value={table.id}>{table.dining_area?.name} · {table.name} ({table.maximum_seats})</option>)}</select></label>{walkIn && <label className="space-y-1.5"><span className="text-sm font-medium">Estado inicial</span><select className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={String(draft.initial_status)} onChange={(e) => setDraft({ ...draft, initial_status: e.target.value })}><option value="ARRIVED">Llegó</option><option value="SEATED">Sentada</option></select></label>}<label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium">Notas para el cliente</span><textarea className="min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm" value={String(draft.notes || "")} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}/></label><label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium">Notas internas</span><textarea className="min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm" value={String(draft.internal_notes || "")} onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })}/></label><div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" asChild><Link href="/admin/dashboard/restaurant/reservations">Cancelar</Link></Button><Button disabled={saving}>{saving ? "Guardando…" : "Guardar reserva"}</Button></div></form></main>; }

export function RestaurantReservationDetail({ id }: { id: number }) {
  const [reservation, setReservation] = useState<RestaurantReservation | null>(null);
  const load = async () => { try { setReservation(await getRestaurantReservation(id)); } catch (error) { await notify.error(errorMessage(error)); } };
  useEffect(() => { void load(); }, [id]);
  if (!reservation) return <Loading />;
  const proofUrl = reservation.deposit_proof_image_url ? getImageUrl(reservation.deposit_proof_image_url) : null;
  const isPdfProof = Boolean(proofUrl?.toLowerCase().includes(".pdf"));

  return <main className="mx-auto max-w-3xl space-y-5 pb-10">
    <header className="flex items-start justify-between"><div><p className="font-mono text-sm text-slate-500">{reservation.reservation_code}</p><h1 className="text-2xl font-bold text-slate-950">{reservation.customer_name}</h1><p className="text-slate-600">{labels[reservation.status]} · {sourceLabels[reservation.source]}</p></div><Button asChild><Link href={`/admin/dashboard/restaurant/reservations/${id}/edit`}>Editar</Link></Button></header>
    <section className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">{[["Fecha", new Date(reservation.start_time).toLocaleDateString("es-BO")], ["Horario", `${time(reservation.start_time)} – ${time(reservation.end_time)}`], ["Comensales", reservation.party_size], ["Mesa", reservation.table?.name || "—"], ["Teléfono", reservation.customer_phone || "—"], ["Correo", reservation.customer_email || "—"]].map(([label, value]) => <div key={String(label)} className="bg-white p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</section>
    {reservation.deposit_amount_cents > 0 && <section className="rounded-xl border border-admin-brand/20 bg-admin-brand/5 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-admin-brand"/><h2 className="font-semibold text-slate-950">Depósito</h2></div><p className="mt-1 text-sm text-slate-600">Bs. {(reservation.deposit_amount_cents / 100).toFixed(2)} · {reservation.deposit_mode === "PER_PERSON" ? "por persona" : "por mesa"}</p></div>{proofUrl ? <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-md border border-admin-brand/30 bg-white px-3 text-sm font-medium text-admin-brand hover:bg-admin-brand/5"><Eye className="mr-2 h-4 w-4"/>Ver comprobante</a> : <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Sin comprobante</span>}</div>{proofUrl && !isPdfProof && <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-4 block w-fit"><img src={proofUrl} alt="Comprobante de depósito" className="max-h-80 max-w-full rounded-lg border border-slate-200 bg-white object-contain p-1"/></a>}{proofUrl && isPdfProof && <p className="mt-3 text-sm text-slate-600">El comprobante es un PDF. Abrilo para revisarlo.</p>}</section>}
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Acciones</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {transitions[reservation.status].map(([status, label]) => (
          <Button
            key={status}
            variant="outline"
            onClick={async () => {
              try {
                await updateRestaurantReservationStatus(id, status, status === "CANCELLED" ? window.prompt("Motivo de cancelación") || undefined : undefined);
                await load();
              } catch (error) {
                await notify.error(errorMessage(error));
              }
            }}
          >
            {label}
          </Button>
        ))}
      </div>
    </section>
    {reservation.notes && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Notas para el cliente</h2><p className="mt-2 text-sm text-slate-600">{reservation.notes}</p></section>}
    {reservation.internal_notes && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Notas internas</h2><p className="mt-2 text-sm text-slate-600">{reservation.internal_notes}</p></section>}
  </main>;
}
function Loading() { return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-admin-brand" /></div>; } function Failure({ message, retry }: { message: string; retry: () => void }) { return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{message}<Button className="ml-3" variant="outline" onClick={retry}>Reintentar</Button></div>; }
