"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { canUseEntitledFeature } from "@/lib/plans/capabilities";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { getImageUrl } from "@/utils/image-url";
import {
  createRestaurantServicePeriod,
  deleteRestaurantServicePeriod,
  getRestaurantAccess,
  getRestaurantSettings,
  listRestaurantServicePeriods,
  type RestaurantServicePeriod,
  type RestaurantSettings,
  updateRestaurantAccess,
  updateRestaurantServicePeriod,
  updateRestaurantSettings,
  uploadAdminQrProof,
} from "@/app/admin/lib/adminApi";

const DAYS = ["common.days.sunday", "common.days.monday", "common.days.tuesday", "common.days.wednesday", "common.days.thursday", "common.days.friday", "common.days.saturday"] as const;
const DEFAULT_PERIOD = { day_of_week: 1, name: "", start_time: "12:00", end_time: "15:00", sort_order: 0, is_active: true };
const message = (error: unknown) => error instanceof Error ? error.message : "No pudimos completar la operación.";

function NumberField({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function ToggleField({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>;
}

export function RestaurantSettingsManager() {
  const t = useT();
  const { companyUser } = useAdminAuth();
  const [access, setAccess] = useState<{ enabled: boolean } | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [periods, setPeriods] = useState<RestaurantServicePeriod[]>([]);
  const [draftPeriod, setDraftPeriod] = useState(DEFAULT_PERIOD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entitled = canUseEntitledFeature(companyUser?.company, "RESTAURANT_MODULE");
  const companyId = companyUser?.company?.id;

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const nextAccess = await getRestaurantAccess(); setAccess(nextAccess);
      if (nextAccess.enabled) {
        const [nextSettings, nextPeriods] = await Promise.all([getRestaurantSettings(), listRestaurantServicePeriods()]);
        setSettings(nextSettings); setPeriods(nextPeriods);
      }
    } catch (cause) { setError(message(cause)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try { setSettings(await updateRestaurantSettings({ ...settings, id: undefined, company_id: undefined } as Omit<RestaurantSettings, "id" | "company_id">)); await notify.success(t("common.success")); }
    catch (cause) { await notify.error(message(cause)); } finally { setSaving(false); }
  };
  const uploadDepositQr = async (file: File) => {
    if (!settings || !companyId) return;
    setUploadingQr(true);
    try { setSettings({ ...settings, deposit_qr_image_url: await uploadAdminQrProof(file, companyId) }); await notify.success("Código QR cargado. Guardá la configuración para publicarlo."); }
    catch (cause) { await notify.error(message(cause)); } finally { setUploadingQr(false); }
  };
  const toggleModule = async () => { setSaving(true); try { const next = await updateRestaurantAccess(!access?.enabled); setAccess(next); if (next.enabled) await load(); } catch (cause) { await notify.error(message(cause)); } finally { setSaving(false); } };
  const addPeriod = async () => { try { const created = await createRestaurantServicePeriod({ ...draftPeriod, name: draftPeriod.name || null }); setPeriods((current) => [...current, created]); setDraftPeriod(DEFAULT_PERIOD); } catch (cause) { await notify.error(message(cause)); } };
  const mutatePeriod = async (period: RestaurantServicePeriod, changes: Partial<RestaurantServicePeriod>) => { try { const updated = await updateRestaurantServicePeriod(period.id, changes); setPeriods((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (cause) { await notify.error(message(cause)); } };
  const removePeriod = async (id: number) => { try { await deleteRestaurantServicePeriod(id); setPeriods((current) => current.filter((item) => item.id !== id)); } catch (cause) { await notify.error(message(cause)); } };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-admin-brand" /></div>;
  if (!entitled) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{t("restaurant.unsupported")}</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}<Button variant="outline" className="ml-3" onClick={() => void load()}>{t("common.retry")}</Button></div>;

  return <div className="mx-auto max-w-5xl space-y-8 pb-10">
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-900">{t("restaurant.title")}</h2><p className="mt-1 text-sm text-slate-600">{access?.enabled ? t("restaurant.moduleEnabled") : t("restaurant.moduleDisabled")}</p></div><Button disabled={saving} variant={access?.enabled ? "outline" : "default"} onClick={() => void toggleModule()}>{access?.enabled ? t("restaurant.disable") : t("restaurant.enable")}</Button></section>
    {!access?.enabled ? <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">{t("restaurant.moduleDisabled")}</section> : <>
      {settings && <section className="space-y-5"><h2 className="text-lg font-semibold text-slate-900">{t("restaurant.settings")}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><NumberField label={t("restaurant.averageDining")} min={15} value={settings.average_dining_minutes} onChange={(value) => setSettings({ ...settings, average_dining_minutes: value })}/><NumberField label={t("restaurant.slotInterval")} min={5} value={settings.slot_interval_minutes} onChange={(value) => setSettings({ ...settings, slot_interval_minutes: value })}/><NumberField label={t("restaurant.minimumAdvance")} value={settings.minimum_advance_minutes} onChange={(value) => setSettings({ ...settings, minimum_advance_minutes: value })}/><NumberField label={t("restaurant.maximumAdvance")} min={1} value={settings.maximum_advance_days} onChange={(value) => setSettings({ ...settings, maximum_advance_days: value })}/><NumberField label={t("restaurant.cancellationDeadline")} value={settings.cancellation_limit_minutes} onChange={(value) => setSettings({ ...settings, cancellation_limit_minutes: value })}/><NumberField label={t("restaurant.minimumParty")} min={1} value={settings.minimum_party_size} onChange={(value) => setSettings({ ...settings, minimum_party_size: value })}/><NumberField label={t("restaurant.maximumParty")} min={1} value={settings.maximum_party_size} onChange={(value) => setSettings({ ...settings, maximum_party_size: value })}/><NumberField label={t("restaurant.turnoverBuffer")} min={0} value={settings.turnover_buffer_minutes} onChange={(value) => setSettings({ ...settings, turnover_buffer_minutes: value })}/><NumberField label={t("restaurant.cleanupBuffer")} min={0} value={settings.cleanup_buffer_minutes} onChange={(value) => setSettings({ ...settings, cleanup_buffer_minutes: value })}/><NumberField label={t("restaurant.atRiskWindow")} min={1} value={settings.at_risk_warning_window_minutes} onChange={(value) => setSettings({ ...settings, at_risk_warning_window_minutes: value })}/></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><ToggleField label={t("restaurant.autoConfirm")} checked={settings.auto_confirm_reservations} onCheckedChange={(value) => setSettings({ ...settings, auto_confirm_reservations: value })}/><ToggleField label={t("restaurant.allowCancellation")} checked={settings.allow_customer_cancellation} onCheckedChange={(value) => setSettings({ ...settings, allow_customer_cancellation: value })}/><ToggleField label={t("restaurant.requirePhone")} checked={settings.require_phone} onCheckedChange={(value) => setSettings({ ...settings, require_phone: value })}/><ToggleField label={t("restaurant.requireEmail")} checked={settings.require_email} onCheckedChange={(value) => setSettings({ ...settings, require_email: value })}/><ToggleField label={t("restaurant.allowWalkIns")} checked={settings.allow_walk_ins} onCheckedChange={(value) => setSettings({ ...settings, allow_walk_ins: value })}/></div>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><ToggleField label="Solicitar depósito al reservar" checked={settings.deposit_enabled} onCheckedChange={(value) => setSettings({ ...settings, deposit_enabled: value })}/>{settings.deposit_enabled && <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Depósito (Bs.)</Label><Input type="number" min="0.01" step="0.01" value={(settings.deposit_amount_cents / 100).toFixed(2)} onChange={(event) => setSettings({ ...settings, deposit_amount_cents: Math.max(0, Math.round(Number(event.target.value || 0) * 100)) })}/></div><div className="space-y-1.5"><Label>Cómo se calcula</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={settings.deposit_mode} onChange={(event) => setSettings({ ...settings, deposit_mode: event.target.value as RestaurantSettings["deposit_mode"] })}><option value="PER_TABLE">Por mesa</option><option value="PER_PERSON">Por persona</option></select></div><div className="sm:col-span-2"><Label>QR para el depósito</Label><div className="mt-2 flex flex-wrap items-center gap-3">{settings.deposit_qr_image_url ? <img src={getImageUrl(settings.deposit_qr_image_url) || ""} alt="Código QR del depósito" className="h-24 w-24 rounded-lg border border-slate-200 bg-white object-contain p-1"/> : <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400"><ImagePlus className="h-5 w-5"/></div>}<label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingQr} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDepositQr(file); }}/>{uploadingQr ? "Cargando…" : "Subir QR"}</label>{settings.deposit_qr_image_url && <Button type="button" variant="ghost" className="text-red-700" onClick={() => setSettings({ ...settings, deposit_qr_image_url: null })}>Quitar</Button>}</div></div></div>}</section>
        <Button disabled={saving || uploadingQr} onClick={() => void saveSettings()}>{t("restaurant.save")}</Button></section>}
      <section className="space-y-4 border-t border-slate-200 pt-7"><h2 className="text-lg font-semibold text-slate-900">{t("restaurant.servicePeriods")}</h2><div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-6"><select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={draftPeriod.day_of_week} onChange={(event) => setDraftPeriod({ ...draftPeriod, day_of_week: Number(event.target.value) })}>{DAYS.map((day, index) => <option key={day} value={index}>{t(day)}</option>)}</select><Input placeholder={t("restaurant.name")} value={draftPeriod.name} onChange={(event) => setDraftPeriod({ ...draftPeriod, name: event.target.value })}/><Input type="time" value={draftPeriod.start_time} onChange={(event) => setDraftPeriod({ ...draftPeriod, start_time: event.target.value })}/><Input type="time" value={draftPeriod.end_time} onChange={(event) => setDraftPeriod({ ...draftPeriod, end_time: event.target.value })}/><Button className="md:col-span-2" onClick={() => void addPeriod()}><Plus className="mr-2 h-4 w-4"/>{t("restaurant.createPeriod")}</Button></div>{periods.length === 0 ? <p className="text-sm text-slate-500">{t("restaurant.emptyPeriods")}</p> : <div className="space-y-2">{periods.map((period) => <div key={period.id} className="grid items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_100px_100px_auto_auto]"><span className="text-sm font-medium">{t(DAYS[period.day_of_week])}</span><Input value={period.name ?? ""} placeholder={t("restaurant.name")} onBlur={(event) => void mutatePeriod(period, { name: event.target.value || null })}/><Input type="time" value={period.start_time} onChange={(event) => void mutatePeriod(period, { start_time: event.target.value })}/><Input type="time" value={period.end_time} onChange={(event) => void mutatePeriod(period, { end_time: event.target.value })}/><ToggleField label={period.is_active ? t("restaurant.active") : t("restaurant.inactive")} checked={period.is_active} onCheckedChange={(value) => void mutatePeriod(period, { is_active: value })}/><Button variant="ghost" size="icon" onClick={() => void removePeriod(period.id)} aria-label={t("common.delete")}><Trash2 className="h-4 w-4"/></Button></div>)}</div>}</section>
    </>}</div>;
}
