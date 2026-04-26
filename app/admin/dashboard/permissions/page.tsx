"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader, AdminPageShell, ConfirmDialog, StatusBadge } from "@/components/admin/shared";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { canUsePlanFeature, getCurrentPlan, getRequiredPlanForFeature } from "@/lib/plans/capabilities";
import {
    StaffMember,
    StaffTimeOffRequest,
    StaffTimeOffStatus,
    cancelTimeOffRequest,
    createTimeOffRequest,
    getStaff,
    listTimeOffRequests,
    reviewTimeOffRequest,
} from "@/app/admin/lib/adminApi";

function statusTone(status: StaffTimeOffStatus): "success" | "warning" | "danger" | "neutral" {
    if (status === "APPROVED") return "success";
    if (status === "REJECTED") return "danger";
    if (status === "CANCELLED") return "neutral";
    return "warning";
}

export default function PermissionsPage() {
    const { role, isAuthenticated, companyUser, user } = useAdminAuth();
    const { locale } = useI18n();
    const t = useT();
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";
    const permissionsFeature = "STAFF_AVAILABILITY" as const;
    const plan = getCurrentPlan(companyUser?.company);
    const canUsePermissions = Boolean(user?.is_super_admin) || canUsePlanFeature(companyUser?.company, permissionsFeature);

    const [loading, setLoading] = useState(true);
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [requestStaffId, setRequestStaffId] = useState<string>("ALL");
    const [requests, setRequests] = useState<StaffTimeOffRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<StaffTimeOffStatus | "ALL">("ALL");
    const [requestStaffFilter, setRequestStaffFilter] = useState<string>("ALL");
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [reason, setReason] = useState("");
    const [pendingConfirm, setPendingConfirm] = useState<{
        type: "REJECT" | "CANCEL";
        requestId: number;
    } | null>(null);

    const getStatusLabel = useCallback(
        (status: StaffTimeOffStatus | "ALL") => {
            if (status === "ALL") return t("adminPermissions.all");
            if (status === "PENDING") return t("adminPermissions.pending");
            if (status === "APPROVED") return t("adminPermissions.approved");
            if (status === "REJECTED") return t("adminPermissions.rejected");
            return t("adminPermissions.cancelled");
        },
        [t],
    );

    const requestStaffNumericId = useMemo(() => {
        if (requestStaffId === "ALL") return null;
        const n = parseInt(requestStaffId, 10);
        return Number.isNaN(n) ? null : n;
    }, [requestStaffId]);

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
        try {
            if (isOwnerOrAdmin) {
                const staff = await getStaff();
                setStaffList(staff);
                if (staff.length > 0) {
                    setRequestStaffId(String(staff[0].id));
                    setRequestStaffFilter("ALL");
                }
            }
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("adminPermissions.loadRequestsError"));
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, role, isOwnerOrAdmin, t]);

    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        if (!loading) {
            void loadRequests().catch((err) =>
                notify.error(err instanceof Error ? err.message : t("adminPermissions.loadRequestsError")),
            );
        }
    }, [loading, loadRequests, t]);

    const submitTimeOff = async () => {
        if (isOwnerOrAdmin && !requestStaffNumericId) {
            void notify.warning(t("adminPermissions.selectStaffFirst"));
            return;
        }
        if (!startsAt || !endsAt) {
            void notify.warning(t("adminPermissions.dateTimeRequired"));
            return;
        }

        setSubmittingRequest(true);
        try {
            await createTimeOffRequest({
                starts_at: new Date(startsAt).toISOString(),
                ends_at: new Date(endsAt).toISOString(),
                reason: reason.trim() || undefined,
                ...(isOwnerOrAdmin && requestStaffNumericId ? { staff_id: requestStaffNumericId } : {}),
            });
            setStartsAt("");
            setEndsAt("");
            setReason("");
            await notify.success(t("adminPermissions.requestSubmitted"));
            await loadRequests();
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("adminPermissions.submitRequestError"));
        } finally {
            setSubmittingRequest(false);
        }
    };

    const handleReview = async (requestId: number, status: "APPROVED" | "REJECTED") => {
        try {
            await reviewTimeOffRequest(requestId, { status });
            await notify.success(
                t("adminPermissions.requestReviewed", { status: getStatusLabel(status).toLowerCase() }),
            );
            await loadRequests();
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("adminPermissions.reviewRequestError"));
        }
    };

    const handleCancel = async (requestId: number) => {
        try {
            await cancelTimeOffRequest(requestId);
            await notify.success(t("adminPermissions.requestCancelled"));
            await loadRequests();
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("adminPermissions.cancelRequestError"));
        }
    };

    if (!isAuthenticated || !role) {
        return null;
    }

    if (!canUsePermissions) {
        const requiredPlan = getRequiredPlanForFeature(companyUser?.company, permissionsFeature);
        return (
            <AdminPageShell>
                <AdminPageHeader eyebrow={t("adminNav.schedule")} title={t("adminPermissions.title")} />
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={
                        requiredPlan === "PRO"
                            ? t("planEnforcement.availableOnPro")
                            : t("planEnforcement.availableOnBusiness")
                    }
                    feature={permissionsFeature}
                    currentPlan={plan}
                    requiredPlan={requiredPlan}
                    fullPage
                />
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
        <AdminPageShell>
            <AdminPageHeader
                eyebrow={t("adminNav.schedule")}
                title={t("adminPermissions.title")}
                subtitle={isOwnerOrAdmin ? t("adminPermissions.subtitleOwnerAdmin") : t("adminPermissions.subtitleStaff")}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(300px,420px)_1fr]">
                <Card className="admin-card h-fit">
                    <CardHeader className="gap-1 pb-4">
                        <CardTitle className="text-base">
                            {isOwnerOrAdmin
                                ? t("adminPermissions.requestForTeam")
                                : t("adminPermissions.myTimeOffRequests")}
                        </CardTitle>
                        <CardDescription>
                            {isOwnerOrAdmin
                                ? t("adminPermissions.timeOffOwnerDescription")
                                : t("adminPermissions.timeOffStaffDescription")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isOwnerOrAdmin ? (
                            <div className="space-y-2">
                                <Label>{t("adminPermissions.staffMember")}</Label>
                                <Select value={requestStaffId} onValueChange={setRequestStaffId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminPermissions.selectStaff")} />
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

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="space-y-2">
                                <Label>{t("adminPermissions.startsAt")}</Label>
                                <Input
                                    type="datetime-local"
                                    value={startsAt}
                                    onChange={(e) => setStartsAt(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminPermissions.endsAt")}</Label>
                                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("adminPermissions.reasonOptional")}</Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t("adminPermissions.reasonPlaceholder")}
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={submitTimeOff}
                            disabled={submittingRequest || (isOwnerOrAdmin && !requestStaffNumericId)}
                            className="w-full bg-admin-brand text-white hover:bg-admin-brand-hover"
                        >
                            {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submittingRequest ? t("adminPermissions.submittingRequest") : t("adminPermissions.submitRequest")}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="admin-card">
                    <CardHeader className="gap-4 pb-4">
                        <div>
                            <CardTitle className="text-base">{t("adminPermissions.requestsList")}</CardTitle>
                            <CardDescription>{t("adminPermissions.requestsListDescription")}</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="w-full sm:w-[180px]">
                                <Label className="text-xs">{t("adminPermissions.status")}</Label>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) => setStatusFilter(v as StaffTimeOffStatus | "ALL")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">{t("adminPermissions.all")}</SelectItem>
                                        <SelectItem value="PENDING">{t("adminPermissions.pending")}</SelectItem>
                                        <SelectItem value="APPROVED">{t("adminPermissions.approved")}</SelectItem>
                                        <SelectItem value="REJECTED">{t("adminPermissions.rejected")}</SelectItem>
                                        <SelectItem value="CANCELLED">{t("adminPermissions.cancelled")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {isOwnerOrAdmin ? (
                                <div className="w-full sm:w-[220px]">
                                    <Label className="text-xs">{t("adminPermissions.staff")}</Label>
                                    <Select value={requestStaffFilter} onValueChange={setRequestStaffFilter}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">{t("adminPermissions.allStaff")}</SelectItem>
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
                    </CardHeader>
                    <CardContent>
                        {requests.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-admin-border bg-admin-surface-subtle p-6 text-sm text-slate-500">
                                {t("adminPermissions.noRequestsFound")}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {requests.map((request) => {
                                    const canReview = isOwnerOrAdmin && request.status === "PENDING";
                                    const canCancel = request.status === "PENDING" || request.status === "APPROVED";

                                    return (
                                        <div key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium text-slate-900">
                                                            {request.staff?.display_name || t("adminPermissions.staffFallback")}
                                                        </p>
                                                        <StatusBadge tone={statusTone(request.status)} dot>
                                                            {getStatusLabel(request.status)}
                                                        </StatusBadge>
                                                        {request.status === "PENDING" ? (
                                                            <span className="text-xs text-slate-500">
                                                                {t("adminPermissions.pendingApproval")}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-sm text-slate-600">
                                                        {new Date(request.starts_at).toLocaleString(locale)}{" "}
                                                        {t("adminPermissions.to")}{" "}
                                                        {new Date(request.ends_at).toLocaleString(locale)}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {request.reason || t("adminPermissions.noReasonProvided")}
                                                    </p>
                                                </div>

                                                {(canReview || canCancel) ? (
                                                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                                        {canReview ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleReview(request.id, "APPROVED")}
                                                                    className="bg-admin-brand text-white hover:bg-admin-brand-hover"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                    {t("adminPermissions.approve")}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setPendingConfirm({ type: "REJECT", requestId: request.id })}
                                                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                    {t("adminPermissions.reject")}
                                                                </Button>
                                                            </>
                                                        ) : null}
                                                        {canCancel ? (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setPendingConfirm({ type: "CANCEL", requestId: request.id })}
                                                                className="text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                                                            >
                                                                {t("adminPermissions.cancel")}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                open={Boolean(pendingConfirm)}
                onOpenChange={(open) => {
                    if (!open) setPendingConfirm(null);
                }}
                title={
                    pendingConfirm?.type === "REJECT"
                        ? t("adminPermissions.rejectConfirmTitle")
                        : t("adminPermissions.cancelConfirmTitle")
                }
                description={
                    pendingConfirm?.type === "REJECT"
                        ? t("adminPermissions.rejectConfirmDescription")
                        : t("adminPermissions.cancelConfirmDescription")
                }
                confirmLabel={
                    pendingConfirm?.type === "REJECT"
                        ? t("adminPermissions.rejectConfirmAction")
                        : t("adminPermissions.cancelConfirmAction")
                }
                cancelLabel={t("common.cancel")}
                variant="destructive"
                onConfirm={async () => {
                    if (!pendingConfirm) return;
                    if (pendingConfirm.type === "REJECT") {
                        await handleReview(pendingConfirm.requestId, "REJECTED");
                    } else {
                        await handleCancel(pendingConfirm.requestId);
                    }
                    setPendingConfirm(null);
                }}
            />
        </AdminPageShell>
    );
}
