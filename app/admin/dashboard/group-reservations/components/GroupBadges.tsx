"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import type {
    GroupBookingStatus,
    GroupItemStatus,
    GroupPaymentStatus,
    GroupTicketStatus,
} from "@/app/admin/lib/adminApi";

export function GroupStatusBadge({ status }: { status: GroupItemStatus }) {
    const t = useT();
    if (status === "PUBLISHED") return <Badge className="bg-emerald-100 text-emerald-700">{t("adminGroup.status.published")}</Badge>;
    if (status === "ARCHIVED") return <Badge className="bg-slate-100 text-slate-700">{t("adminGroup.status.archived")}</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">{t("adminGroup.status.draft")}</Badge>;
}

export function GroupBookingStatusBadge({ status }: { status: GroupBookingStatus }) {
    const t = useT();
    if (status === "CONFIRMED") return <Badge className="bg-emerald-100 text-emerald-700">{t("adminGroup.bookingStatus.confirmed")}</Badge>;
    if (status === "CANCELLED") return <Badge className="bg-rose-100 text-rose-700">{t("adminGroup.bookingStatus.cancelled")}</Badge>;
    if (status === "WAITLISTED") return <Badge className="bg-blue-100 text-blue-700">{t("adminGroup.bookingStatus.waitlisted")}</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">{t("adminGroup.bookingStatus.pending")}</Badge>;
}

export function GroupPaymentStatusBadge({ status }: { status: GroupPaymentStatus }) {
    const t = useT();
    if (status === "PAID") return <Badge className="bg-emerald-100 text-emerald-700">{t("adminGroup.paymentStatus.paid")}</Badge>;
    if (status === "PENDING_CONFIRMATION") return <Badge className="bg-amber-100 text-amber-700">{t("adminGroup.paymentStatus.pendingConfirmation")}</Badge>;
    if (status === "REJECTED") return <Badge className="bg-rose-100 text-rose-700">{t("adminGroup.paymentStatus.rejected")}</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">{t("adminGroup.paymentStatus.unpaid")}</Badge>;
}

export function GroupTicketStatusBadge({ status }: { status: GroupTicketStatus }) {
    const t = useT();
    if (status === "ACTIVE") return <Badge className="bg-emerald-100 text-emerald-700">{t("adminGroup.ticketStatus.active")}</Badge>;
    if (status === "USED") return <Badge className="bg-blue-100 text-blue-700">{t("adminGroup.ticketStatus.used")}</Badge>;
    if (status === "CANCELLED") return <Badge className="bg-rose-100 text-rose-700">{t("adminGroup.ticketStatus.cancelled")}</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">{t("adminGroup.ticketStatus.expired")}</Badge>;
}
