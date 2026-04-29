"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitlementLockedCard } from "@/components/admin/product/EntitlementLockedCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { AdminPageHeader, AdminPageShell, ConfirmDialog } from "@/components/admin/shared";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { canUseEntitledFeature } from "@/lib/plans/capabilities";
import {
    StaffAvailabilitySlot,
    StaffMember,
    assignStaffAvailabilityFromStoreHours,
    getMyStaffAvailability,
    getStaff,
    getStaffAvailability,
    saveStaffAvailability,
} from "@/app/admin/lib/adminApi";

export default function AvailabilityPage() {
    const { role, isAuthenticated, companyUser, user } = useAdminAuth();
    const t = useT();
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";
    const isStaff = role === "STAFF";
    const availabilityFeature = "STAFF_AVAILABILITY" as const;
    const canUseAvailability = Boolean(user?.is_super_admin) || canUseEntitledFeature(companyUser?.company, availabilityFeature);

    const [loading, setLoading] = useState(true);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [confirmAutoAssignOpen, setConfirmAutoAssignOpen] = useState(false);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string>("ALL");
    const [slots, setSlots] = useState<StaffAvailabilitySlot[]>([]);

    const days = useMemo(
        () => [
            { value: 0, label: t("adminHours.sunday") },
            { value: 1, label: t("adminHours.monday") },
            { value: 2, label: t("adminHours.tuesday") },
            { value: 3, label: t("adminHours.wednesday") },
            { value: 4, label: t("adminHours.thursday") },
            { value: 5, label: t("adminHours.friday") },
            { value: 6, label: t("adminHours.saturday") },
        ],
        [t],
    );

    const selectedStaffNumericId = useMemo(() => {
        if (selectedStaffId === "ALL") return null;
        const n = parseInt(selectedStaffId, 10);
        return Number.isNaN(n) ? null : n;
    }, [selectedStaffId]);

    const selectedStaff = useMemo(
        () => staffList.find((staff) => staff.id === selectedStaffNumericId) || null,
        [staffList, selectedStaffNumericId],
    );

    const loadSchedule = useCallback(async () => {
        if (!isAuthenticated || !role || !canUseAvailability) return;

        if (isOwnerOrAdmin) {
            if (!selectedStaffNumericId) {
                setSlots([]);
                return;
            }
            const data = await getStaffAvailability(selectedStaffNumericId);
            setSlots(data.slots || []);
            return;
        }

        if (isStaff) {
            const data = await getMyStaffAvailability();
            setSlots(data.slots || []);
        }
    }, [canUseAvailability, isAuthenticated, role, isOwnerOrAdmin, isStaff, selectedStaffNumericId]);

    const loadInitial = useCallback(async () => {
        if (!isAuthenticated || !role || !canUseAvailability) return;

        setLoading(true);
        try {
            if (isOwnerOrAdmin) {
                const staff = await getStaff();
                setStaffList(staff);
                if (staff.length > 0) {
                    setSelectedStaffId(String(staff[0].id));
                }
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("adminAvailability.loadAvailabilityError"));
        } finally {
            setLoading(false);
        }
    }, [canUseAvailability, isAuthenticated, role, isOwnerOrAdmin, t]);

    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        if (!loading) {
            void loadSchedule().catch((err) =>
                notify.error(err instanceof Error ? err.message : t("adminAvailability.loadScheduleError")),
            );
        }
    }, [loading, loadSchedule, t]);

    const addSlot = (dayOfWeek: number) => {
        setSlots((prev) => [
            ...prev,
            {
                day_of_week: dayOfWeek,
                start_time: "09:00",
                end_time: "17:00",
                is_active: true,
            },
        ]);
    };

    const updateSlot = (index: number, field: keyof StaffAvailabilitySlot, value: string) => {
        setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)));
    };

    const removeSlot = (index: number) => {
        setSlots((prev) => prev.filter((_, i) => i !== index));
    };

    const saveSchedule = async () => {
        if (!selectedStaffNumericId) {
            void notify.warning(t("adminAvailability.selectStaffFirst"));
            return;
        }
        setSavingSchedule(true);
        try {
            await saveStaffAvailability(selectedStaffNumericId, slots);
            await notify.success(t("adminAvailability.scheduleSaved"));
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("adminAvailability.saveScheduleError"));
        } finally {
            setSavingSchedule(false);
        }
    };

    const runAutoAssign = async (overwrite: boolean) => {
        if (!selectedStaffNumericId) {
            void notify.warning(t("adminAvailability.selectStaffFirst"));
            return;
        }

        setAutoAssigning(true);
        try {
            const data = await assignStaffAvailabilityFromStoreHours(selectedStaffNumericId, overwrite);
            setSlots(data.slots || []);
            setConfirmAutoAssignOpen(false);
            await notify.success(t("adminAvailability.autoAssignSuccess"));
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("adminAvailability.autoAssignError"));
        } finally {
            setAutoAssigning(false);
        }
    };

    const handleAutoAssign = () => {
        if (!selectedStaffNumericId) {
            void notify.warning(t("adminAvailability.selectStaffFirst"));
            return;
        }

        if (slots.length > 0) {
            setConfirmAutoAssignOpen(true);
            return;
        }

        void runAutoAssign(false);
    };

    if (!isAuthenticated || !role) {
        return null;
    }

    if (!canUseAvailability) {
        return (
            <AdminPageShell>
                <AdminPageHeader
                    eyebrow={t("adminNav.schedule")}
                    title={t("adminAvailability.title")}
                    subtitle={t("adminAvailability.subtitleOwnerAdmin")}
                    actions={isOwnerOrAdmin ? (
                        <Button type="button" variant="outline" disabled>
                            <RefreshCw className="h-4 w-4" />
                            {t("adminAvailability.autoAssignStoreAvailability")}
                        </Button>
                    ) : undefined}
                />

                <div className="space-y-6">
                    <EntitlementLockedCard
                        title={t("entitlements.advancedAvailabilityLockedTitle")}
                        description={t("entitlements.advancedAvailabilityLockedDescription")}
                        capability="RESERVAS_PRO"
                        source="ADMIN_LOCKED_PAGE"
                        notice={t("entitlements.reservationsProLocked")}
                    />

                    <Card className="admin-card opacity-70">
                        <CardHeader className="gap-3 pb-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Clock3 className="h-4 w-4 text-admin-brand" />
                                        {t("adminAvailability.staffWeeklySchedule")}
                                    </CardTitle>
                                    <CardDescription className="max-w-3xl">
                                        {t("adminAvailability.scheduleDescription")}
                                    </CardDescription>
                                </div>
                                {isOwnerOrAdmin ? (
                                    <div className="w-full max-w-sm space-y-2">
                                        <Label>{t("adminAvailability.staffMember")}</Label>
                                        <Select value="LOCKED" disabled onValueChange={() => undefined}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("adminAvailability.selectStaff")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="LOCKED">{t("entitlements.reservationsProLocked")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm leading-6 text-slate-600">
                                {t("entitlements.advancedAvailabilityLockedDescription")}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button type="button" variant="outline" disabled>
                                    <Plus className="h-4 w-4" />
                                    {t("adminAvailability.addSlot")}
                                </Button>
                                <Button type="button" variant="outline" disabled>
                                    <RefreshCw className="h-4 w-4" />
                                    {t("adminAvailability.autoAssignStoreAvailability")}
                                </Button>
                                <Button type="button" disabled>
                                    {t("adminAvailability.saveSchedule")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AdminPageShell>
        );
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
            </div>
        );
    }

    return (
        <AdminPageShell className="pb-24 md:pb-0">
            <AdminPageHeader
                eyebrow={t("adminNav.schedule")}
                title={t("adminAvailability.title")}
                subtitle={isOwnerOrAdmin ? t("adminAvailability.subtitleOwnerAdmin") : t("adminAvailability.subtitleStaff")}
                actions={
                    isOwnerOrAdmin ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAutoAssign}
                            disabled={!selectedStaffNumericId || autoAssigning || staffList.length === 0}
                        >
                            {autoAssigning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {t("adminAvailability.autoAssignStoreAvailability")}
                        </Button>
                    ) : null
                }
            />

            <Card className="admin-card">
                <CardHeader className="gap-3 pb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock3 className="h-4 w-4 text-admin-brand" />
                                {isOwnerOrAdmin
                                    ? t("adminAvailability.staffWeeklySchedule")
                                    : t("adminAvailability.myWeeklySchedule")}
                            </CardTitle>
                            <CardDescription className="max-w-3xl">
                                {t("adminAvailability.scheduleDescription")}
                            </CardDescription>
                        </div>
                        {isOwnerOrAdmin ? (
                            <div className="w-full max-w-sm space-y-2">
                                <Label>{t("adminAvailability.staffMember")}</Label>
                                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminAvailability.selectStaff")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffList.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                    </div>
                    {isOwnerOrAdmin ? (
                        <p className="text-xs text-slate-500">{t("adminAvailability.autoAssignDescription")}</p>
                    ) : null}
                </CardHeader>
                <CardContent>
                    {isOwnerOrAdmin && staffList.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-admin-border bg-admin-surface-subtle p-6 text-sm text-slate-500">
                            {t("adminAvailability.noStaffMembers")}
                        </div>
                    ) : (
                        <div className="grid gap-3 xl:grid-cols-2">
                            {days.map((day) => {
                                const daySlots = slots
                                    .map((slot, index) => ({ slot, index }))
                                    .filter((entry) => entry.slot.day_of_week === day.value);

                                return (
                                    <section
                                        key={day.value}
                                        className="rounded-lg border border-admin-border bg-admin-surface-subtle p-3"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="text-sm font-semibold text-slate-900">{day.label}</h2>
                                                <p className="text-xs text-slate-500">
                                                    {daySlots.length > 0
                                                        ? t("adminAvailability.dayOpen", { count: daySlots.length })
                                                        : t("adminAvailability.dayClosed")}
                                                </p>
                                            </div>
                                            <Badge variant={daySlots.length > 0 ? "secondary" : "outline"}>
                                                {daySlots.length > 0 ? daySlots.length : 0}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            {daySlots.length === 0 ? (
                                                <p className="rounded-md border border-dashed border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-500">
                                                    {t("adminAvailability.noSlotsConfigured")}
                                                </p>
                                            ) : null}

                                            {daySlots.map(({ slot, index }) => (
                                                <div
                                                    key={`${day.value}-${index}`}
                                                    className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2"
                                                >
                                                    <Input
                                                        type="time"
                                                        value={slot.start_time}
                                                        onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                                                        disabled={!isOwnerOrAdmin}
                                                        className="h-10"
                                                        aria-label={`${day.label} ${t("adminHours.open")}`}
                                                    />
                                                    <span className="text-xs text-slate-500">{t("adminAvailability.to")}</span>
                                                    <Input
                                                        type="time"
                                                        value={slot.end_time}
                                                        onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                                                        disabled={!isOwnerOrAdmin}
                                                        className="h-10"
                                                        aria-label={`${day.label} ${t("adminHours.close")}`}
                                                    />
                                                    {isOwnerOrAdmin ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => removeSlot(index)}
                                                            aria-label={t("common.delete")}
                                                            className="text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <span className="h-8 w-8" aria-hidden="true" />
                                                    )}
                                                </div>
                                            ))}

                                            {isOwnerOrAdmin ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addSlot(day.value)}
                                                    className="mt-1 w-full sm:w-auto"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    {t("adminAvailability.addSlot")}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isOwnerOrAdmin ? (
                <StickyFormActions
                    onSave={saveSchedule}
                    loading={savingSchedule}
                    disabled={!selectedStaff || staffList.length === 0}
                    saveLabel={t("adminAvailability.saveSchedule")}
                    loadingLabel={t("adminAvailability.saveSchedule")}
                    saveClassName="bg-admin-brand text-white hover:bg-admin-brand-hover"
                />
            ) : null}

            <ConfirmDialog
                open={confirmAutoAssignOpen}
                onOpenChange={setConfirmAutoAssignOpen}
                title={t("adminAvailability.autoAssignConfirmTitle")}
                description={t("adminAvailability.autoAssignConfirmDescription")}
                confirmLabel={t("adminAvailability.autoAssignConfirmAction")}
                cancelLabel={t("common.cancel")}
                loading={autoAssigning}
                onConfirm={() => runAutoAssign(true)}
            />
        </AdminPageShell>
    );
}
