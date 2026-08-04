"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import {
  createRestaurantDiningArea,
  createRestaurantTable,
  createRestaurantTableCombination,
  deleteRestaurantDiningArea,
  deleteRestaurantTable,
  deleteRestaurantTableCombination,
  getRestaurantAccess,
  listRestaurantDiningAreas,
  listRestaurantTables,
  listRestaurantTableCombinations,
  type RestaurantDiningArea,
  type RestaurantTable,
  type RestaurantTableCombination,
  updateRestaurantDiningArea,
  updateRestaurantTable,
} from "@/app/admin/lib/adminApi";

const newArea = { name: "", description: "", sort_order: 0, is_active: true };
const newTableDraft = { name: "", minimum_seats: 1, maximum_seats: 2 };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pudimos completar la operación.";
}

function duplicateName(table: RestaurantTable, existingNames: Set<string>, copyNumber: number) {
  let suffix = copyNumber + 1;
  let name = `${table.name} (${suffix})`;
  while (existingNames.has(name.toLocaleLowerCase())) {
    suffix += 1;
    name = `${table.name} (${suffix})`;
  }
  existingNames.add(name.toLocaleLowerCase());
  return name;
}

function SeatField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="grid gap-1 text-xs font-medium text-slate-600"><span>{label}</span><Input type="number" min={1} value={value} onChange={(event) => onChange(Number(event.target.value))}/></label>;
}

export function RestaurantTablesManager() {
  const t = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [areas, setAreas] = useState<RestaurantDiningArea[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [combinations, setCombinations] = useState<RestaurantTableCombination[]>([]);
  const [combinationName, setCombinationName] = useState("");
  const [combinationTableIds, setCombinationTableIds] = useState<number[]>([]);
  const [areaDraft, setAreaDraft] = useState(newArea);
  const [tableDrafts, setTableDrafts] = useState<Record<number, typeof newTableDraft>>({});
  const [duplicateDraft, setDuplicateDraft] = useState<{ tableId: number; count: number } | null>(null);
  const [duplicatingTableId, setDuplicatingTableId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const access = await getRestaurantAccess();
      setEnabled(access.enabled);
      if (access.enabled) {
        const [nextAreas, nextTables, nextCombinations] = await Promise.all([listRestaurantDiningAreas(), listRestaurantTables(), listRestaurantTableCombinations()]);
        setAreas(nextAreas);
        setTables(nextTables);
        setCombinations(nextCombinations);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const grouped = useMemo(
    () => new Map(areas.map((area) => [area.id, tables.filter((table) => table.dining_area_id === area.id)])),
    [areas, tables],
  );

  const addArea = async () => {
    try {
      const area = await createRestaurantDiningArea({ ...areaDraft, description: areaDraft.description || null });
      setAreas((current) => [...current, area]);
      setAreaDraft(newArea);
    } catch (cause) {
      await notify.error(errorMessage(cause));
    }
  };

  const updateArea = async (area: RestaurantDiningArea, changes: Partial<RestaurantDiningArea>) => {
    try {
      const updated = await updateRestaurantDiningArea(area.id, changes);
      setAreas((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      await notify.error(errorMessage(cause));
    }
  };

  const removeArea = async (id: number) => {
    try {
      await deleteRestaurantDiningArea(id);
      setAreas((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      await notify.error(errorMessage(cause));
    }
  };

  const addTable = async (areaId: number) => {
    const draft = tableDrafts[areaId] ?? newTableDraft;
    try {
      const table = await createRestaurantTable({ dining_area_id: areaId, ...draft, sort_order: 0, is_active: true });
      setTables((current) => [...current, table]);
      setTableDrafts((current) => ({ ...current, [areaId]: newTableDraft }));
    } catch (cause) {
      await notify.error(errorMessage(cause));
    }
  };

  const updateTable = async (table: RestaurantTable, changes: Partial<RestaurantTable>) => {
    try {
      const updated = await updateRestaurantTable(table.id, changes);
      setTables((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      await notify.error(errorMessage(cause));
    }
  };

  const removeTable = async (id: number) => {
    try {
      await deleteRestaurantTable(id);
      setTables((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      await notify.error(errorMessage(cause));
    }
  };

  const duplicateTable = async (table: RestaurantTable) => {
    const requestedCount = Math.floor(duplicateDraft?.count ?? 1);
    const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(50, requestedCount)) : 1;
    const names = new Set(tables.filter((item) => item.dining_area_id === table.dining_area_id).map((item) => item.name.trim().toLocaleLowerCase()));
    setDuplicatingTableId(table.id);
    try {
      const copies: RestaurantTable[] = [];
      for (let index = 0; index < count; index += 1) {
        copies.push(await createRestaurantTable({
          dining_area_id: table.dining_area_id,
          name: duplicateName(table, names, index + 1),
          minimum_seats: table.minimum_seats,
          maximum_seats: table.maximum_seats,
          sort_order: table.sort_order + index + 1,
          is_active: table.is_active,
        }));
      }
      setTables((current) => [...current, ...copies]);
      setDuplicateDraft(null);
      await notify.success(`${copies.length} ${copies.length === 1 ? "mesa creada" : "mesas creadas"}.`);
    } catch (cause) {
      await notify.error(errorMessage(cause));
    } finally {
      setDuplicatingTableId(null);
    }
  };

  const addCombination = async () => {
    if (!combinationName.trim() || combinationTableIds.length < 2) return;
    try {
      const areaId = tables.find((table) => combinationTableIds.includes(table.id))?.dining_area_id ?? null;
      const created = await createRestaurantTableCombination({ name: combinationName.trim(), dining_area_id: areaId, table_ids: combinationTableIds });
      setCombinations((current) => [...current, created]); setCombinationName(""); setCombinationTableIds([]);
      await notify.success("Combinación creada.");
    } catch (cause) { await notify.error(errorMessage(cause)); }
  };

  const removeCombination = async (id: number) => {
    try { await deleteRestaurantTableCombination(id); setCombinations((current) => current.filter((item) => item.id !== id)); }
    catch (cause) { await notify.error(errorMessage(cause)); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-admin-brand" /></div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>;
  if (!enabled) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">{t("restaurant.moduleDisabled")}</div>;

  return <div className="mx-auto max-w-5xl space-y-8 pb-10">
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold text-slate-900">{t("restaurant.diningAreas")}</h2><p className="text-sm text-slate-600">{t("restaurant.tables")}</p></div>
      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
        <Input placeholder={t("restaurant.name")} value={areaDraft.name} onChange={(event) => setAreaDraft({ ...areaDraft, name: event.target.value })}/>
        <Input placeholder={t("restaurant.description")} value={areaDraft.description} onChange={(event) => setAreaDraft({ ...areaDraft, description: event.target.value })}/>
        <Button onClick={() => void addArea()}><Plus className="mr-2 h-4 w-4"/>{t("restaurant.createArea")}</Button>
      </div>
    </section>

    {areas.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">{t("restaurant.emptyAreas")}</p> : <div className="space-y-5">{areas.map((area) => {
      const areaTables = grouped.get(area.id) ?? [];
      const draft = tableDrafts[area.id] ?? newTableDraft;
      return <section key={area.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input className="max-w-xs font-medium" value={area.name} onBlur={(event) => void updateArea(area, { name: event.target.value })}/>
          <Input className="max-w-sm" value={area.description ?? ""} placeholder={t("restaurant.description")} onBlur={(event) => void updateArea(area, { description: event.target.value || null })}/>
          <div className="flex items-center gap-2 sm:ml-auto"><Label className="text-xs text-slate-500">{area.is_active ? t("restaurant.active") : t("restaurant.inactive")}</Label><Switch checked={area.is_active} onCheckedChange={(value) => void updateArea(area, { is_active: value })}/><Button variant="ghost" size="icon" onClick={() => void removeArea(area.id)} aria-label={t("common.delete")}><Trash2 className="h-4 w-4"/></Button></div>
        </div>

        <div className="mt-5 space-y-2">{areaTables.map((table) => <div key={table.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="grid items-end gap-2 sm:grid-cols-[1fr_110px_110px_auto_auto_auto]">
            <Input value={table.name} onBlur={(event) => void updateTable(table, { name: event.target.value })}/>
            <SeatField label={t("restaurant.minimumSeats")} value={table.minimum_seats} onChange={(value) => void updateTable(table, { minimum_seats: value })}/>
            <SeatField label={t("restaurant.maximumSeats")} value={table.maximum_seats} onChange={(value) => void updateTable(table, { maximum_seats: value })}/>
            <div className="flex items-center gap-2 text-xs text-slate-600"><Switch checked={table.is_active} onCheckedChange={(value) => void updateTable(table, { is_active: value })}/>{table.is_active ? t("restaurant.active") : t("restaurant.inactive")}</div>
            <Button variant="ghost" size="icon" onClick={() => setDuplicateDraft({ tableId: table.id, count: 1 })} aria-label="Duplicar mesa"><Copy className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={() => void removeTable(table.id)} aria-label={t("common.delete")}><Trash2 className="h-4 w-4"/></Button>
          </div>
          {duplicateDraft?.tableId === table.id ? <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-white p-3">
            <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Copias a crear</span><Input className="w-28" type="number" min={1} max={50} value={duplicateDraft.count} onChange={(event) => setDuplicateDraft({ tableId: table.id, count: Number(event.target.value) })}/></label>
            <p className="pb-2 text-xs text-slate-500">Se copiarán la capacidad y el estado de esta mesa. Los nombres se numeran automáticamente.</p>
            <div className="ml-auto flex gap-2"><Button size="sm" variant="ghost" onClick={() => setDuplicateDraft(null)}><X className="mr-1 h-3.5 w-3.5"/>Cancelar</Button><Button size="sm" disabled={duplicatingTableId === table.id} onClick={() => void duplicateTable(table)}>{duplicatingTableId === table.id ? "Duplicando…" : "Crear copias"}</Button></div>
          </div> : null}
        </div>)}</div>

        <div className="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_110px_110px_auto]">
          <Input placeholder={t("restaurant.name")} value={draft.name} onChange={(event) => setTableDrafts({ ...tableDrafts, [area.id]: { ...draft, name: event.target.value } })}/>
          <SeatField label={t("restaurant.minimumSeats")} value={draft.minimum_seats} onChange={(value) => setTableDrafts({ ...tableDrafts, [area.id]: { ...draft, minimum_seats: value } })}/>
          <SeatField label={t("restaurant.maximumSeats")} value={draft.maximum_seats} onChange={(value) => setTableDrafts({ ...tableDrafts, [area.id]: { ...draft, maximum_seats: value } })}/>
          <Button variant="outline" onClick={() => void addTable(area.id)}><Plus className="mr-2 h-4 w-4"/>{t("restaurant.createTable")}</Button>
        </div>
      </section>;
    })}</div>}

    <section className="space-y-4 border-t border-slate-200 pt-7">
      <div><h2 className="text-lg font-semibold text-slate-900">Combinaciones de mesas</h2><p className="text-sm text-slate-600">Definí configuraciones permanentes que el piso puede activar temporalmente para una reserva.</p></div>
      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
        <Input placeholder="Nombre de la combinación" value={combinationName} onChange={(event) => setCombinationName(event.target.value)}/>
        <Button disabled={combinationTableIds.length < 2 || !combinationName.trim()} onClick={() => void addCombination()}><Plus className="mr-2 h-4 w-4"/>Crear combinación</Button>
        <div className="grid gap-2 md:col-span-2 sm:grid-cols-2 lg:grid-cols-3">{tables.filter((table) => table.is_active).map((table) => <label key={table.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${combinationTableIds.includes(table.id) ? "border-admin-brand/50 bg-admin-brand/5" : "border-slate-200 bg-white"}`}><input type="checkbox" checked={combinationTableIds.includes(table.id)} onChange={(event) => setCombinationTableIds((current) => event.target.checked ? [...current, table.id] : current.filter((id) => id !== table.id))}/><span>{table.dining_area?.name} · {table.name}</span></label>)}</div>
      </div>
      {combinations.length ? <div className="grid gap-3 md:grid-cols-2">{combinations.map((combination) => <article key={combination.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><h3 className="font-semibold text-slate-900">{combination.name}</h3><p className="mt-1 text-sm text-slate-600">{combination.tables.map((item) => item.table.name).join(" + ")}</p></div><Button variant="ghost" size="icon" onClick={() => void removeCombination(combination.id)} aria-label={t("common.delete")}><Trash2 className="h-4 w-4"/></Button></article>)}</div> : <p className="text-sm text-slate-500">Todavía no hay combinaciones definidas.</p>}
    </section>
  </div>;
}
