"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Plus, Save } from "lucide-react";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyFromCents } from "@/lib/currency";
import { buildPublicPassBookingPath, copyPublicUrl } from "@/lib/admin/public-links";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import {
    createServicePassOffering,
    getServicePassOfferings,
    updateServicePassOffering,
    type ServicePassDuration,
    type ServicePassOffering,
} from "@/app/admin/lib/adminApi";

export function ServicePassOfferingsPanel() {
    const { companyUser } = useAdminAuth();
    const t = useT();
    const currency = companyUser?.company?.currency;
    const companySlug = companyUser?.company?.slug;
    const [offerings, setOfferings] = useState<ServicePassOffering[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState<ServicePassDuration>("DAY");
    const [price, setPrice] = useState("");

    const loadOfferings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setOfferings(await getServicePassOfferings());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : t("adminPasses.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { void loadOfferings(); }, [loadOfferings]);

    const openNew = () => {
        setEditingId(null);
        setTitle("");
        setDescription("");
        setDuration("DAY");
        setPrice("");
        setDialogOpen(true);
    };

    const openEdit = (offering: ServicePassOffering) => {
        setEditingId(offering.id);
        setTitle(offering.title);
        setDescription(offering.description ?? "");
        setDuration(offering.duration);
        setPrice((offering.price_cents / 100).toFixed(2));
        setDialogOpen(true);
    };

    const saveOffering = async () => {
        const parsedPrice = Number(price || 0);
        if (!title.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) return;
        setSaving(true);
        setError(null);
        try {
            const input = {
                title: title.trim(),
                description: description.trim() || null,
                duration,
                price_cents: Math.round(parsedPrice * 100),
            };
            if (editingId) await updateServicePassOffering(editingId, input);
            else await createServicePassOffering(input);
            setDialogOpen(false);
            await loadOfferings();
            void notify.success(t("adminPasses.created"));
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : t("adminPasses.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const toggleOffering = async (offering: ServicePassOffering) => {
        try {
            await updateServicePassOffering(offering.id, { is_active: !offering.is_active });
            await loadOfferings();
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : t("adminPasses.saveError"));
        }
    };

    const passPath = (offeringId: number) => companySlug
        ? buildPublicPassBookingPath(companySlug, offeringId)
        : null;

    const copyBookingLink = async (offeringId: number) => {
        const path = passPath(offeringId);
        if (!path) return;
        try {
            await copyPublicUrl(path);
            void notify.success(t("adminPasses.offerLinkCopied"));
        } catch {
            void notify.error(t("common.error"));
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle>{t("adminPasses.title")}</CardTitle>
                    <p className="text-sm text-text-muted">{t("adminPasses.subtitle")}</p>
                </div>
                <Button onClick={openNew} className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" />{t("adminPasses.addOffer")}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
                {loading ? (
                    <div className="flex min-h-24 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
                ) : offerings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-text-muted">{t("adminPasses.noOffers")}</div>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {offerings.map((offering) => (
                            <div key={offering.id} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-slate-950">{offering.title}</h3>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${offering.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                                {offering.is_active ? t("adminPasses.active") : t("adminPasses.inactive")}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {offering.duration === "DAY" ? t("adminPasses.day") : t("adminPasses.month")} · {formatCurrencyFromCents(offering.price_cents, currency)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-text-muted">{t("adminPasses.reservations")}: {offering._count?.reservations ?? 0}</span>
                                </div>
                                {offering.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{offering.description}</p> : null}
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                    <Button size="sm" variant="outline" disabled={!passPath(offering.id) || !offering.is_active} onClick={() => void copyBookingLink(offering.id)}>
                                        <Copy className="mr-1.5 h-3.5 w-3.5" />{t("adminPasses.copyBookingLink")}
                                    </Button>
                                    {passPath(offering.id) && offering.is_active ? (
                                        <Button asChild size="sm" variant="ghost">
                                            <a href={passPath(offering.id)!} target="_blank" rel="noreferrer">
                                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />{t("adminPasses.publicLink")}
                                            </a>
                                        </Button>
                                    ) : null}
                                    <Button size="sm" variant="ghost" onClick={() => openEdit(offering)}>{t("common.edit")}</Button>
                                    <Button size="sm" variant="ghost" onClick={() => void toggleOffering(offering)}>
                                        {offering.is_active ? t("adminPasses.inactive") : t("adminPasses.active")}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? t("adminPasses.editOffer") : t("adminPasses.addOffer")}</DialogTitle>
                        <DialogDescription>{t("adminPasses.subtitle")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2"><Label htmlFor="pass-offer-name">{t("adminPasses.name")}</Label><Input id="pass-offer-name" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></div>
                        <div className="space-y-2"><Label htmlFor="pass-offer-description">{t("adminPasses.description")}</Label><textarea id="pass-offer-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="admin-textarea min-h-[100px] resize-y" /></div>
                        <div className="space-y-2"><Label>{t("adminPasses.duration")}</Label><Select value={duration} onValueChange={(value) => setDuration(value as ServicePassDuration)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DAY">{t("adminPasses.day")}</SelectItem><SelectItem value="MONTH">{t("adminPasses.month")}</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="pass-offer-price">{t("adminPasses.price")}</Label><Input id="pass-offer-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                        <Button onClick={() => void saveOffering()} disabled={saving || !title.trim()}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{t("adminPasses.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
