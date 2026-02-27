"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import {
    StaffMember,
    StaffAvailabilitySlot,
    StaffTimeOffRequest,
    StaffTimeOffStatus,
    getStaff,
    getStaffAvailability,
    getMyStaffAvailability,
    saveStaffAvailability,
    listTimeOffRequests,
    createTimeOffRequest,
    reviewTimeOffRequest,
    cancelTimeOffRequest,
} from "@/app/admin/lib/adminApi";

function statusVariant(status: StaffTimeOffStatus): "default" | "secondary" | "destructive" | "outline" {
    if (status === "APPROVED") return "default";
    if (status === "REJECTED") return "destructive";
    if (status === "CANCELLED") return "outline";
    return "secondary";
}

export default function AvailabilityPage() {
    const { role, isAuthenticated } = useAdminAuth();
    const { locale } = useI18n();
    const t = useT();
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";
    const isStaff = role === "STAFF";

    const [loading, setLoading] = useState(true);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string>("ALL");
    const [slots, setSlots] = useState<StaffAvailabilitySlot[]>([]);
    const [requests, setRequests] = useState<StaffTimeOffRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<StaffTimeOffStatus | "ALL">("ALL");
    const [requestStaffFilter, setRequestStaffFilter] = useState<string>("ALL");

    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [reason, setReason] = useState("");
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

    const getStatusLabel = useCallback(
        (status: StaffTimeOffStatus | "ALL") => {
            if (status === "ALL") return t("adminAvailability.all");
            if (status === "PENDING") return t("adminAvailability.pending");
            if (status === "APPROVED") return t("adminAvailability.approved");
            if (status === "REJECTED") return t("adminAvailability.rejected");
            return t("adminAvailability.cancelled");
        },
        [t],
    );

    const selectedStaffNumericId = useMemo(() => {
        if (selectedStaffId === "ALL") return null;
        const n = parseInt(selectedStaffId, 10);
        return Number.isNaN(n) ? null : n;
    }, [selectedStaffId]);

    const loadSchedule = useCallback(async () => {
        if (!isAuthenticated || !role) return;

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
    }, [isAuthenticated, role, isOwnerOrAdmin, isStaff, selectedStaffNumericId]);

    const loadRequests = useCallback(async () => {
        if (!isAuthenticated || !role) return;

        const params: { status?: StaffTimeOffStatus; staff_id?: number } = {};
        if (statusFilter !== "ALL") params.status = statusFilter;
        if (isOwnerOrAdmin && requestStaffFilter !== "ALL") {
            params.staff_id = parseInt(requestStaffFilter, 10);
        }
        const data = await listTimeOffRequests(params);
        setRequests(data);
    }, [isAuthenticated, role, statusFilter, isOwnerOrAdmin, requestStaffFilter]);

    const loadInitial = useCallback(async () => {
        if (!isAuthenticated || !role) return;

        setLoading(true);
        setError(null);
        try {
            if (isOwnerOrAdmin) {
                const staff = await getStaff();
                setStaffList(staff);
                if (staff.length > 0) {
                    setSelectedStaffId(String(staff[0].id));
                    setRequestStaffFilter("ALL");
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminAvailability.loadAvailabilityError"));
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, role, isOwnerOrAdmin, t]);

    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        if (!loading) {
            void loadSchedule().catch((err) =>
                setError(err instanceof Error ? err.message : t("adminAvailability.loadScheduleError")),
            );
        }
    }, [loading, loadSchedule, t]);

    useEffect(() => {
        if (!loading) {
            void loadRequests().catch((err) =>
                setError(err instanceof Error ? err.message : t("adminAvailability.loadRequestsError")),
            );
        }
    }, [loading, loadRequests, t]);

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
            setError(t("adminAvailability.selectStaffFirst"));
            return;
        }
        setSavingSchedule(true);
        setError(null);
        setSuccess(null);
        try {
            await saveStaffAvailability(selectedStaffNumericId, slots);
            setSuccess(t("adminAvailability.scheduleSaved"));
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminAvailability.saveScheduleError"));
        } finally {
            setSavingSchedule(false);
        }
    };

    const submitTimeOff = async () => {
        if (!startsAt || !endsAt) {
            setError(t("adminAvailability.dateTimeRequired"));
            return;
        }
        setSubmittingRequest(true);
        setError(null);
        setSuccess(null);
        try {
            await createTimeOffRequest({
                starts_at: new Date(startsAt).toISOString(),
                ends_at: new Date(endsAt).toISOString(),
                reason: reason.trim() || undefined,
                ...(isOwnerOrAdmin && selectedStaffNumericId ? { staff_id: selectedStaffNumericId } : {}),
            });
            setStartsAt("");
            setEndsAt("");
            setReason("");
            setSuccess(t("adminAvailability.requestSubmitted"));
            await loadRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminAvailability.submitRequestError"));
        } finally {
            setSubmittingRequest(false);
        }
    };

    const handleReview = async (requestId: number, status: "APPROVED" | "REJECTED") => {
        setError(null);
        setSuccess(null);
        try {
            await reviewTimeOffRequest(requestId, { status });
            setSuccess(t("adminAvailability.requestReviewed", { status: getStatusLabel(status).toLowerCase() }));
            await loadRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminAvailability.reviewRequestError"));
        }
    };

    const handleCancel = async (requestId: number) => {
        setError(null);
        setSuccess(null);
        try {
            await cancelTimeOffRequest(requestId);
            setSuccess(t("adminAvailability.requestCancelled"));
            await loadRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminAvailability.cancelRequestError"));
        }
    };

    if (!isAuthenticated || !role) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("adminAvailability.title")}</h1>
                <p className="text-slate-500">
                    {isOwnerOrAdmin
                        ? t("adminAvailability.subtitleOwnerAdmin")
                        : t("adminAvailability.subtitleStaff")}
                </p>
            </div>

            {error && (
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="pt-6 text-rose-700 text-sm">{error}</CardContent>
                </Card>
            )}
            {success && (
                <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="pt-6 text-emerald-700 text-sm">{success}</CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>
                        {isOwnerOrAdmin ? t("adminAvailability.staffWeeklySchedule") : t("adminAvailability.myWeeklySchedule")}
                    </CardTitle>
                    <CardDescription>
                        {t("adminAvailability.scheduleDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isOwnerOrAdmin && (
                        <div className="max-w-sm space-y-2">
                            <Label>{t("adminAvailability.staffMember")}</Label>
                            <Select
                                value={selectedStaffId}
                                onValueChange={(value) => {
                                    setSelectedStaffId(value);
                                    setSuccess(null);
                                    setError(null);
                                }}
                            >
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
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                        {days.map((day) => {
                            const daySlots = slots
                                .map((slot, index) => ({ slot, index }))
                                .filter((entry) => entry.slot.day_of_week === day.value);

                            return (
                                <Card key={day.value} className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{day.label}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {daySlots.length === 0 && (
                                            <p className="text-sm text-slate-500">{t("adminAvailability.noSlotsConfigured")}</p>
                                        )}
                                        {daySlots.map(({ slot, index }) => (
                                            <div key={`${day.value}-${index}`} className="flex items-center gap-2">
                                                <Input
                                                    type="time"
                                                    value={slot.start_time}
                                                    onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                                                    disabled={!isOwnerOrAdmin}
                                                />
                                                <span className="text-slate-500 text-sm">{t("adminAvailability.to")}</span>
                                                <Input
                                                    type="time"
                                                    value={slot.end_time}
                                                    onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                                                    disabled={!isOwnerOrAdmin}
                                                />
                                                {isOwnerOrAdmin && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => removeSlot(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {isOwnerOrAdmin && (
                                            <Button type="button" variant="outline" size="sm" onClick={() => addSlot(day.value)}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                {t("adminAvailability.addSlot")}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {isOwnerOrAdmin && (
                        <div className="pt-2">
                            <Button onClick={saveSchedule} disabled={savingSchedule}>
                                {savingSchedule ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                {t("adminAvailability.saveSchedule")}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{isOwnerOrAdmin ? t("adminAvailability.timeOffManagement") : t("adminAvailability.myTimeOffRequests")}</CardTitle>
                    <CardDescription>
                        {isOwnerOrAdmin
                            ? t("adminAvailability.timeOffOwnerDescription")
                            : t("adminAvailability.timeOffStaffDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t("adminAvailability.startsAt")}</Label>
                            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminAvailability.endsAt")}</Label>
                            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("adminAvailability.reasonOptional")}</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t("adminAvailability.reasonPlaceholder")}
                        />
                    </div>
                    <div>
                        <Button onClick={submitTimeOff} disabled={submittingRequest}>
                            {submittingRequest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {t("adminAvailability.submitRequest")}
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                        <div className="w-[180px]">
                            <Label className="text-xs">{t("adminAvailability.status")}</Label>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StaffTimeOffStatus | "ALL")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t("adminAvailability.all")}</SelectItem>
                                    <SelectItem value="PENDING">{t("adminAvailability.pending")}</SelectItem>
                                    <SelectItem value="APPROVED">{t("adminAvailability.approved")}</SelectItem>
                                    <SelectItem value="REJECTED">{t("adminAvailability.rejected")}</SelectItem>
                                    <SelectItem value="CANCELLED">{t("adminAvailability.cancelled")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {isOwnerOrAdmin && (
                            <div className="w-[220px]">
                                <Label className="text-xs">{t("adminAvailability.staff")}</Label>
                                <Select value={requestStaffFilter} onValueChange={setRequestStaffFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">{t("adminAvailability.allStaff")}</SelectItem>
                                        {staffList.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {requests.length === 0 && (
                            <p className="text-sm text-slate-500">{t("adminAvailability.noRequestsFound")}</p>
                        )}
                        {requests.map((request) => (
                            <Card key={request.id} className="border-slate-200">
                                <CardContent className="pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900">
                                                {request.staff?.display_name || t("adminAvailability.staffFallback")}
                                            </p>
                                            <Badge variant={statusVariant(request.status)}>{getStatusLabel(request.status)}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {new Date(request.starts_at).toLocaleString(locale)} {t("adminAvailability.to")}{" "}
                                            {new Date(request.ends_at).toLocaleString(locale)}
                                        </p>
                                        <p className="text-sm text-slate-500">{request.reason || t("adminAvailability.noReasonProvided")}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isOwnerOrAdmin && request.status === "PENDING" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReview(request.id, "APPROVED")}
                                                >
                                                    <Check className="h-4 w-4 mr-1" />
                                                    {t("adminAvailability.approve")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReview(request.id, "REJECTED")}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    {t("adminAvailability.reject")}
                                                </Button>
                                            </>
                                        )}
                                        {(request.status === "PENDING" || request.status === "APPROVED") && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleCancel(request.id)}
                                            >
                                                {t("adminAvailability.cancel")}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
