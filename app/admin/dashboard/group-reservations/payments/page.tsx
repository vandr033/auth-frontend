"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, RefreshCcw, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    bulkSendGroupInstallmentReminders,
    confirmGroupEnrollmentInstallmentQr,
    getGroupPayments,
    markGroupEnrollmentInstallmentPaid,
    sendGroupInstallmentReminder,
    type AdminGroupPaymentRow,
    type GroupPaymentsLedgerResponse,
    type GroupPaymentStatus,
} from "@/app/admin/lib/adminApi";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { formatMoneyFromCents, formatDateTime } from "../lib/format";
import { GroupPaymentStatusBadge } from "../components/GroupBadges";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";

export default function GroupPaymentsPage() {
    const t = useT();
    const { companyUser } = useAdminAuth();
    const { canUseClasses } = useGroupReservationsAccess();
    const currency = companyUser?.company?.currency;

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [paymentStatus, setPaymentStatus] = useState<"" | GroupPaymentStatus>("");
    const [rowType, setRowType] = useState<"" | "EVENT_PAYMENT" | "CLASS_PAYMENT" | "INSTALLMENT">("");
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [ledger, setLedger] = useState<GroupPaymentsLedgerResponse | null>(null);
    const [qrDialog, setQrDialog] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getGroupPayments({
                search: search || undefined,
                payment_status: paymentStatus || undefined,
                row_type: rowType || undefined,
                overdue_only: overdueOnly || undefined,
                limit: 200,
            });
            setLedger(response);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [overdueOnly, paymentStatus, rowType, search, t]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleSendReminder = async (row: AdminGroupPaymentRow) => {
        if (!row.installment_id) return;
        setBusyKey(`reminder:${row.installment_id}`);
        try {
            await sendGroupInstallmentReminder(row.installment_id);
            await notify.success(t("adminGroup.payments.reminderSent"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.payments.reminderError"));
        } finally {
            setBusyKey(null);
        }
    };

    const handleConfirmQr = async (row: AdminGroupPaymentRow) => {
        if (!row.enrollment_id || !row.installment_id) return;
        setBusyKey(`confirm:${row.installment_id}`);
        try {
            await confirmGroupEnrollmentInstallmentQr(row.enrollment_id, row.installment_id);
            await notify.success(t("adminGroup.payments.installmentConfirmed"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        } finally {
            setBusyKey(null);
        }
    };

    const handleMarkCashPaid = async (row: AdminGroupPaymentRow) => {
        if (!row.enrollment_id || !row.installment_id) return;
        setBusyKey(`cash:${row.installment_id}`);
        try {
            await markGroupEnrollmentInstallmentPaid(row.enrollment_id, row.installment_id, "CASH");
            await notify.success(t("adminGroup.payments.installmentMarkedPaid"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.bookings.actionError"));
        } finally {
            setBusyKey(null);
        }
    };

    const handleBulkReminder = async () => {
        setBusyKey("bulk-reminders");
        try {
            const result = await bulkSendGroupInstallmentReminders({
                overdue_only: overdueOnly || undefined,
            });
            await notify.success(
                t("adminGroup.payments.bulkReminderSummary", {
                    sent: result.sent,
                    skipped: result.skipped,
                    failed: result.failed,
                }),
            );
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.payments.reminderError"));
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t("adminGroup.payments.unpaidTotal")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">
                        {formatMoneyFromCents(ledger?.summary.unpaid_total_cents || 0, currency)}
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t("adminGroup.payments.overdueInstallments")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">
                        {ledger?.summary.overdue_installments || 0}
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t("adminGroup.payments.qrPending")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">
                        {ledger?.summary.qr_pending_confirmations || 0}
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t("adminGroup.payments.paidThisMonth")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-slate-900">
                        {formatMoneyFromCents(ledger?.summary.paid_this_month_cents || 0, currency)}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <CardTitle>{t("adminGroup.payments.title")}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void loadData()}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {t("adminGroup.actions.refresh")}
                        </Button>
                        <Button onClick={() => void handleBulkReminder()} disabled={busyKey === "bulk-reminders" || !canUseClasses}>
                            {busyKey === "bulk-reminders" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {t("adminGroup.payments.bulkReminders")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t("adminGroup.payments.search")}</Label>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("adminGroup.payments.searchPlaceholder")} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.payments.rowType")}</Label>
                            <select
                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                value={rowType}
                                onChange={(event) => setRowType(event.target.value as typeof rowType)}
                            >
                                <option value="">{t("adminGroup.payments.allRows")}</option>
                                <option value="EVENT_PAYMENT">{t("adminGroup.payments.rowTypes.EVENT_PAYMENT")}</option>
                                <option value="CLASS_PAYMENT">{t("adminGroup.payments.rowTypes.CLASS_PAYMENT")}</option>
                                <option value="INSTALLMENT">{t("adminGroup.payments.rowTypes.INSTALLMENT")}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.payments.paymentStatus")}</Label>
                            <select
                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                value={paymentStatus}
                                onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}
                            >
                                <option value="">{t("adminGroup.payments.allStatuses")}</option>
                                <option value="UNPAID">{t("adminGroup.paymentStatus.unpaid")}</option>
                                <option value="PENDING_CONFIRMATION">{t("adminGroup.paymentStatus.pendingConfirmation")}</option>
                                <option value="PAID">{t("adminGroup.paymentStatus.paid")}</option>
                                <option value="REJECTED">{t("adminGroup.paymentStatus.rejected")}</option>
                            </select>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox checked={overdueOnly} onCheckedChange={(checked) => setOverdueOnly(Boolean(checked))} />
                        {t("adminGroup.payments.overdueOnly")}
                    </label>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-admin-brand" />
                        </div>
                    ) : !ledger || ledger.rows.length === 0 ? (
                        <p className="py-8 text-sm text-slate-500">{t("adminGroup.payments.empty")}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("adminGroup.payments.client")}</TableHead>
                                        <TableHead>{t("adminGroup.payments.item")}</TableHead>
                                        <TableHead>{t("adminGroup.payments.rowType")}</TableHead>
                                        <TableHead>{t("adminGroup.payments.dueDate")}</TableHead>
                                        <TableHead>{t("adminGroup.fields.payment")}</TableHead>
                                        <TableHead>{t("adminGroup.payments.lastReminder")}</TableHead>
                                        <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ledger.rows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="font-medium text-slate-900">{row.customer_name}</p>
                                                    <p className="text-xs text-slate-500">{row.customer_email || row.customer_phone || "—"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="font-medium text-slate-900">{row.item_title}</p>
                                                    {row.installment_number ? (
                                                        <p className="text-xs text-slate-500">
                                                            {t("adminGroup.payments.installmentNumber", { number: row.installment_number })}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{t(`adminGroup.payments.rowTypes.${row.row_type}`)}</TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                                {row.due_date ? formatDateTime(row.due_date) : "—"}
                                                {row.paid_at ? <div>{t("adminGroup.payments.paidAtShort", { date: formatDateTime(row.paid_at) })}</div> : null}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-slate-700">{formatMoneyFromCents(row.amount_cents, currency)}</p>
                                                    <GroupPaymentStatusBadge status={row.payment_status} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                                {row.last_reminder_at
                                                    ? `${formatDateTime(row.last_reminder_at)} · ${row.last_reminder_channel || ""}`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="flex flex-wrap gap-2">
                                                {row.qr_proof_image_url ? (
                                                    <Button size="sm" variant="outline" onClick={() => setQrDialog(row.qr_proof_image_url)}>
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        {t("adminGroup.actions.viewQrProof")}
                                                    </Button>
                                                ) : null}
                                                {row.row_type === "INSTALLMENT" && row.payment_status === "PENDING_CONFIRMATION" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleConfirmQr(row)}
                                                        disabled={busyKey === `confirm:${row.installment_id}`}
                                                    >
                                                        {busyKey === `confirm:${row.installment_id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        {t("adminGroup.payments.confirmQr")}
                                                    </Button>
                                                ) : null}
                                                {row.row_type === "INSTALLMENT" && row.payment_status !== "PAID" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleMarkCashPaid(row)}
                                                        disabled={busyKey === `cash:${row.installment_id}`}
                                                    >
                                                        {busyKey === `cash:${row.installment_id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        {t("adminGroup.payments.markCashPaid")}
                                                    </Button>
                                                ) : null}
                                                {row.row_type === "INSTALLMENT" && row.payment_status !== "PAID" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleSendReminder(row)}
                                                        disabled={busyKey === `reminder:${row.installment_id}`}
                                                    >
                                                        {busyKey === `reminder:${row.installment_id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                        {t("adminGroup.payments.sendReminder")}
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!qrDialog} onOpenChange={(open) => { if (!open) setQrDialog(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t("adminGroup.actions.viewQrProof")}</DialogTitle>
                    </DialogHeader>
                    {qrDialog ? (
                        <div className="flex flex-col items-center gap-3 py-2">
                            <img
                                src={qrDialog}
                                alt="QR proof"
                                className="max-h-80 w-full rounded-lg border border-slate-200 object-contain"
                            />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
