"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notify";
import {
    deleteGroupQrProof,
    submitMyInstallmentQrProof,
    type GroupEnrollmentInstallment,
    type GroupEnrollmentInstallmentPlan,
    uploadGroupQrProof,
} from "@/app/shop/lib/groupReservationsApi";
import { formatGroupDate, formatGroupMoney } from "@/app/shop/lib/groupReservationsFormat";

type InstallmentPlanCardProps = {
    plan: GroupEnrollmentInstallmentPlan;
    companyId: number;
    locale: string;
    t: (key: string, params?: Record<string, string | number>) => string;
    onRefresh: () => Promise<void>;
};

const statusStyles: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING_CONFIRMATION: "bg-amber-50 text-amber-700 border-amber-200",
    UNPAID: "bg-slate-100 text-slate-700 border-slate-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    OVERDUE: "bg-rose-50 text-rose-700 border-rose-200",
};

function getInstallmentStatus(installment: GroupEnrollmentInstallment) {
    return installment.derived_status || installment.payment_status;
}

export function InstallmentPlanCard({
    plan,
    companyId,
    locale,
    t,
    onRefresh,
}: InstallmentPlanCardProps) {
    const [open, setOpen] = useState(false);
    const [busyInstallmentId, setBusyInstallmentId] = useState<number | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
    const currency = plan.enrollment.company?.currency ?? null;

    const handleSubmitQr = async (installment: GroupEnrollmentInstallment) => {
        const file = selectedFiles[installment.id];
        if (!file) {
            await notify.warning(t("shopGroup.installments.qrFileRequired"));
            return;
        }

        let uploadedUrl: string | undefined;
        setBusyInstallmentId(installment.id);
        try {
            uploadedUrl = await uploadGroupQrProof(file, companyId);
            await submitMyInstallmentQrProof({
                company_id: companyId,
                enrollment_id: plan.enrollment.id,
                installment_id: installment.id,
                qr_proof_image_url: uploadedUrl,
            });
            setSelectedFiles((prev) => ({ ...prev, [installment.id]: null }));
            await notify.success(t("shopGroup.installments.qrSubmitted"));
            await onRefresh();
        } catch (error) {
            if (uploadedUrl) {
                await deleteGroupQrProof(uploadedUrl);
            }
            await notify.error(error instanceof Error ? error.message : t("shopGroup.installments.qrSubmitError"));
        } finally {
            setBusyInstallmentId(null);
        }
    };

    return (
        <>
            <div className="space-y-3 rounded-xl border border-surface-border bg-section p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-text-main">{t("shopGroup.installments.title")}</h3>
                        <p className="text-sm text-text-muted">
                            {t("shopGroup.installments.summary", {
                                paid: plan.summary.paid_count,
                                total: plan.summary.total_installments,
                            })}
                        </p>
                    </div>
                    {plan.summary.overdue_count > 0 ? (
                        <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                            {t("shopGroup.installments.overdueCount", { count: plan.summary.overdue_count })}
                        </Badge>
                    ) : null}
                </div>

                <div className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t("shopGroup.installments.totalPaid", {
                            amount: formatGroupMoney(plan.summary.paid_amount_cents, currency),
                        })}
                    </p>
                    <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {plan.summary.next_due_date
                            ? t("shopGroup.installments.nextDue", {
                                date: formatGroupDate(plan.summary.next_due_date, locale),
                            })
                            : t("shopGroup.installments.noPending")}
                    </p>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
                    {t("shopGroup.installments.viewPlan")}
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("shopGroup.installments.dialogTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {plan.installments.map((installment) => {
                            const status = getInstallmentStatus(installment);
                            const canUploadQr = installment.payment_status === "UNPAID" || installment.payment_status === "REJECTED";
                            return (
                                <div
                                    key={installment.id}
                                    className="space-y-3 rounded-xl border border-surface-border bg-surface p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-text-main">
                                                {t("shopGroup.installments.installmentNumber", {
                                                    number: installment.installment_number,
                                                })}
                                            </p>
                                            <p className="text-sm text-text-muted">
                                                {t("shopGroup.installments.installmentMeta", {
                                                    due: formatGroupDate(installment.due_date, locale),
                                                    amount: formatGroupMoney(installment.amount_cents, currency),
                                                })}
                                            </p>
                                            {installment.paid_at ? (
                                                <p className="text-xs text-text-muted">
                                                    {t("shopGroup.installments.paidAt", {
                                                        date: formatGroupDate(installment.paid_at, locale),
                                                    })}
                                                </p>
                                            ) : null}
                                            {installment.last_reminder_at ? (
                                                <p className="text-xs text-text-muted">
                                                    {t("shopGroup.installments.lastReminder", {
                                                        date: formatGroupDate(installment.last_reminder_at, locale),
                                                    })}
                                                </p>
                                            ) : null}
                                        </div>
                                        <span
                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[status] || statusStyles.UNPAID}`}
                                        >
                                            {t(`shopGroup.installments.status.${status}`)}
                                        </span>
                                    </div>

                                    {installment.payment_status === "PENDING_CONFIRMATION" ? (
                                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                            {t("shopGroup.installments.pendingConfirmationHelp")}
                                        </p>
                                    ) : null}

                                    {canUploadQr ? (
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-text-muted">
                                                {t("shopGroup.installments.uploadLabel")}
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                className="block w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-text-main"
                                                onChange={(event) =>
                                                    setSelectedFiles((prev) => ({
                                                        ...prev,
                                                        [installment.id]: event.target.files?.[0] ?? null,
                                                    }))
                                                }
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => void handleSubmitQr(installment)}
                                                disabled={busyInstallmentId === installment.id}
                                            >
                                                {busyInstallmentId === installment.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {t("shopGroup.installments.submitQr")}
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
