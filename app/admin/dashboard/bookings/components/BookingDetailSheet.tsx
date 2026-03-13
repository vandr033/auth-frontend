"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar,
    Clock,
    User,
    Scissors,
    DollarSign,
    Phone,
    Mail,
    Pencil,
    Loader2,
    MessageSquareWarning,
} from "lucide-react";
import { AdminBooking } from "@/types/admin-booking";
import { getImageUrl } from "@/utils/image-url";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import type { NoShowNotificationChannel } from "@/app/admin/lib/adminApi";
import { BookingEditDialog } from "./BookingEditDialog";
import { getBookingDisplayStatus } from "../lib/bookingStatus";

interface BookingDetailSheetProps {
    booking: AdminBooking | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate: (id: number, status: AdminBooking["status"]) => Promise<void>;
    onMarkNoShow: (id: number) => Promise<void>;
    onSendNoShowNotification: (
        id: number,
        payload: { channel: NoShowNotificationChannel; message?: string }
    ) => Promise<void>;
    canSendNoShowNotification?: boolean;
    noShowNotificationUpgradeMessage?: string;
    onRefresh?: () => void;
}

const STATUS_STYLES: Record<AdminBooking["status"], string> = {
    PENDING: "bg-amber-100 text-amber-800 hover:bg-amber-200",
    CONFIRMED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    COMPLETED: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    CANCELLED: "bg-rose-100 text-rose-800 hover:bg-rose-200",
    NO_SHOW: "bg-slate-100 text-slate-800 hover:bg-slate-200",
};

export function BookingDetailSheet({
    booking,
    isOpen,
    onClose,
    onStatusUpdate,
    onMarkNoShow,
    onSendNoShowNotification,
    canSendNoShowNotification = true,
    noShowNotificationUpgradeMessage,
    onRefresh,
}: BookingDetailSheetProps) {
    const t = useT();
    const customerPhone = (booking?.customer.phone || "").trim();
    const customerEmail = (booking?.customer.email || "").trim();
    const hasPhone = customerPhone.length > 0;
    const hasEmail = customerEmail.length > 0;
    const hasContactMethod = hasPhone || hasEmail;
    const [editOpen, setEditOpen] = useState(false);
    const [noShowPanelOpen, setNoShowPanelOpen] = useState(false);
    const [noShowSending, setNoShowSending] = useState(false);
    const [notifyCustomerOnNoShow, setNotifyCustomerOnNoShow] = useState(true);
    const [noShowChannel, setNoShowChannel] = useState<NoShowNotificationChannel>("AUTO");
    const [noShowMessageMode, setNoShowMessageMode] = useState<"PRESET" | "CUSTOM">("PRESET");
    const [customNoShowMessage, setCustomNoShowMessage] = useState("");
    const noShowPanelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setNoShowPanelOpen(false);
        setNoShowSending(false);
        setNotifyCustomerOnNoShow(hasContactMethod && canSendNoShowNotification);
        setNoShowChannel("AUTO");
        setNoShowMessageMode("PRESET");
        setCustomNoShowMessage("");
    }, [booking?.id, canSendNoShowNotification, hasContactMethod, isOpen]);

    useEffect(() => {
        if (hasContactMethod && canSendNoShowNotification) return;
        setNotifyCustomerOnNoShow(false);
    }, [canSendNoShowNotification, hasContactMethod]);

    useEffect(() => {
        if (noShowChannel === "WHATSAPP" && !hasPhone) {
            setNoShowChannel(hasEmail ? "EMAIL" : "AUTO");
            return;
        }
        if (noShowChannel === "EMAIL" && !hasEmail) {
            setNoShowChannel(hasPhone ? "WHATSAPP" : "AUTO");
        }
    }, [hasEmail, hasPhone, noShowChannel]);

    useEffect(() => {
        if (!noShowPanelOpen) return;
        const timer = window.setTimeout(() => {
            noShowPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
        return () => window.clearTimeout(timer);
    }, [noShowPanelOpen]);

    if (!booking) return null;

    const displayStatus = getBookingDisplayStatus(booking);
    const canEdit = displayStatus === "PENDING" || displayStatus === "CONFIRMED";
    const canMarkNoShow = displayStatus === "PENDING" || displayStatus === "CONFIRMED";
    const defaultNoShowMessage = t("adminBookings.defaultNoShowMessage", {
        name: booking.customer.full_name || t("adminBookings.client"),
    });

    const handleStatusUpdate = async (status: AdminBooking["status"]) => {
        try {
            await onStatusUpdate(booking.id, status);
        } catch (err: unknown) {
            await notify.error(
                t("adminBookings.statusUpdateFailed"),
                err instanceof Error ? err.message : undefined
            );
        }
    };

    const handleNoShowSubmit = async () => {
        const customMessage = customNoShowMessage.trim();
        if (notifyCustomerOnNoShow && noShowMessageMode === "CUSTOM" && !customMessage) {
            await notify.warning(t("adminBookings.customMessageRequired"));
            return;
        }

        try {
            setNoShowSending(true);
            await onMarkNoShow(booking.id);

            if (notifyCustomerOnNoShow) {
                // Best effort by request: no-show should succeed even if notification fails.
                try {
                    await onSendNoShowNotification(booking.id, {
                        channel: noShowChannel,
                        message: noShowMessageMode === "CUSTOM" ? customMessage : undefined,
                    });
                } catch (notificationErr) {
                    console.warn("No-show notification failed, continuing as sent", notificationErr);
                }
            }

            await notify.success(
                t("adminBookings.noShowMarked"),
                notifyCustomerOnNoShow ? t("adminBookings.noShowNotificationSent") : undefined
            );
            setNoShowPanelOpen(false);
            onClose();
        } catch (err: unknown) {
            await notify.error(
                t("adminBookings.noShowActionFailed"),
                err instanceof Error ? err.message : undefined
            );
        } finally {
            setNoShowSending(false);
        }
    };

    const ActionButtons = () => {
        return (
            <div className="mt-6 flex w-full flex-col gap-2">
                {canEdit && (
                    <Button
                        variant="outline"
                        onClick={() => setEditOpen(true)}
                        className="w-full"
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("adminBookings.editBooking")}
                    </Button>
                )}

                {displayStatus === "PENDING" && (
                    <Button
                        onClick={() => void handleStatusUpdate("CONFIRMED")}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        {t("adminBookings.confirmBooking")}
                    </Button>
                )}

                {displayStatus === "CONFIRMED" && (
                    <Button
                        onClick={() => void handleStatusUpdate("COMPLETED")}
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {t("adminBookings.markCompleted")}
                    </Button>
                )}

                {canMarkNoShow && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNoShowPanelOpen(true)}
                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                        <MessageSquareWarning className="mr-2 h-4 w-4" />
                        {t("adminBookings.markNoShow")}
                    </Button>
                )}

                {canEdit && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleStatusUpdate("CANCELLED")}
                        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                        {t("adminBookings.cancelBooking")}
                    </Button>
                )}

                {noShowPanelOpen && canMarkNoShow && (
                    <div
                        ref={noShowPanelRef}
                        className="mt-2 space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3"
                    >
                        <div>
                            <p className="text-sm font-semibold text-text-main">
                                {t("adminBookings.noShowNotificationTitle")}
                            </p>
                            <p className="text-xs text-text-muted">
                                {t("adminBookings.noShowNotificationDescription")}
                            </p>
                            {!canSendNoShowNotification && (
                                <p className="mt-1 text-xs font-medium text-amber-700">
                                    {noShowNotificationUpgradeMessage || t("planEnforcement.availableOnBusiness")}
                                </p>
                            )}
                        </div>

                        {canSendNoShowNotification && (
                            <div className="flex items-start gap-2">
                                <Checkbox
                                    id="notify-no-show"
                                    checked={hasContactMethod && notifyCustomerOnNoShow}
                                    disabled={!hasContactMethod}
                                    onCheckedChange={(value) => setNotifyCustomerOnNoShow(Boolean(value))}
                                />
                                <div>
                                    <Label htmlFor="notify-no-show" className="text-sm font-medium">
                                        {t("adminBookings.sendNoShowNotification")}
                                    </Label>
                                    {!hasContactMethod && (
                                        <p className="mt-1 text-xs text-amber-700">
                                            {t("adminBookings.noShowNoContact")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {notifyCustomerOnNoShow && (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("adminBookings.notificationChannel")}</Label>
                                    <Select
                                        value={noShowChannel}
                                        onValueChange={(value) => setNoShowChannel(value as NoShowNotificationChannel)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AUTO">{t("adminBookings.channelAuto")}</SelectItem>
                                            {hasPhone && (
                                                <SelectItem value="WHATSAPP">{`WhatsApp (${customerPhone})`}</SelectItem>
                                            )}
                                            {hasEmail && (
                                                <SelectItem value="EMAIL">{`Email (${customerEmail})`}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">{t("adminBookings.messageType")}</Label>
                                    <Select
                                        value={noShowMessageMode}
                                        onValueChange={(value) => setNoShowMessageMode(value as "PRESET" | "CUSTOM")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PRESET">{t("adminBookings.predefinedMessage")}</SelectItem>
                                            <SelectItem value="CUSTOM">{t("adminBookings.customMessage")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {noShowMessageMode === "CUSTOM" && (
                                    <div className="space-y-1">
                                        <Label htmlFor="custom-no-show-message" className="text-xs">
                                            {t("adminBookings.customMessage")}
                                        </Label>
                                        <textarea
                                            id="custom-no-show-message"
                                            value={customNoShowMessage}
                                            onChange={(e) => setCustomNoShowMessage(e.target.value)}
                                            rows={4}
                                            className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            placeholder={t("adminBookings.customMessagePlaceholder")}
                                        />
                                    </div>
                                )}

                                {noShowMessageMode === "PRESET" && (
                                    <div className="space-y-1">
                                        <Label className="text-xs">{t("adminBookings.predefinedMessagePreview")}</Label>
                                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-text-main">
                                            {defaultNoShowMessage}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="mt-2 border-t border-amber-200 pt-3 pb-1">
                            <div className="flex flex-col gap-2">
                                <Button
                                    type="button"
                                    onClick={() => void handleNoShowSubmit()}
                                    disabled={noShowSending}
                                    className="h-11 w-full !bg-amber-600 !text-white hover:!bg-amber-700 border border-amber-700 disabled:opacity-60"
                                >
                                    {noShowSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t("adminBookings.saveNoShow")}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setNoShowPanelOpen(false)}
                                    disabled={noShowSending}
                                    className="h-11 w-full"
                                >
                                    {t("common.cancel")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader className="mb-6 pr-10">
                    <div className="mb-2 flex items-center justify-between pr-2">
                        <Badge variant="outline" className="uppercase tracking-wider">
                            #{booking.id}
                        </Badge>
                        <Badge className={STATUS_STYLES[displayStatus]}>
                            {displayStatus === "NO_SHOW" ? t("adminBookings.noShow") : displayStatus}
                        </Badge>
                    </div>
                    <SheetTitle>{t("adminBookings.details")}</SheetTitle>
                    <SheetDescription>
                        {t("adminBookings.createdOn", { date: format(parseISO(booking.start_at), "MMM d, yyyy") })}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="grid gap-4 rounded-lg border border-surface-border bg-surface p-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-text-muted" />
                            <div>
                                <p className="text-sm font-medium">{t("adminBookings.date")}</p>
                                <p className="text-sm text-text-muted">
                                    {format(parseISO(booking.start_at), "EEEE, MMMM d, yyyy")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-text-muted" />
                            <div>
                                <p className="text-sm font-medium">{t("adminBookings.time")}</p>
                                <p className="text-sm text-text-muted">
                                    {format(parseISO(booking.start_at), "h:mm a")} - {format(parseISO(booking.end_at), "h:mm a")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-text-muted" />
                            <div>
                                <p className="text-sm font-medium">{t("adminBookings.staffMember")}</p>
                                <p className="text-sm text-text-muted">{booking.staff.name}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 text-sm font-semibold">{t("adminBookings.customerInfo")}</h3>
                        <div className="grid gap-3 rounded-lg bg-page p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-text-muted">{t("adminBookings.name")}</span>
                                <span className="text-sm font-medium">{booking.customer.full_name}</span>
                            </div>
                            {booking.customer.phone && (
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-sm text-text-muted">
                                        <Phone className="h-3 w-3" /> {t("adminSettings.phone")}
                                    </span>
                                    <span className="text-sm">{booking.customer.phone}</span>
                                </div>
                            )}
                            {booking.customer.email && (
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-sm text-text-muted">
                                        <Mail className="h-3 w-3" /> {t("adminSettings.email")}
                                    </span>
                                    <span className="text-sm">{booking.customer.email}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 text-sm font-semibold">{t("shopBooking.services")}</h3>
                        <div className="divide-y divide-surface-border rounded-lg border border-surface-border">
                            {booking.services.map((service) => (
                                <div key={service.id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <Scissors className="h-4 w-4 text-text-muted" />
                                        <span className="text-sm font-medium">{service.name}</span>
                                    </div>
                                    <span className="text-sm text-text-muted">
                                        {t("shopBooking.duration", { minutes: service.duration })}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between bg-page p-3 font-semibold">
                                <span className="text-sm">{t("adminBookings.totalPrice")}</span>
                                <span className="flex items-center">
                                    <DollarSign className="h-4 w-4" />
                                    {(booking.total_price / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 text-sm font-semibold">{t("adminBookings.paymentInfo")}</h3>
                        <div className="grid gap-3 rounded-lg bg-page p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-text-muted">{t("adminBookings.method")}</span>
                                <Badge variant="outline">
                                    {booking.payment_method == "QR"
                                        ? t("adminBookings.paymentQr")
                                        : booking.payment_method === "CASH"
                                          ? t("adminBookings.paymentCash")
                                          : t("adminBookings.notSpecified")}
                                </Badge>
                            </div>
                            {booking.payment_method === "QR" && booking.qr_proof_image_url && (
                                <div className="mt-2 text-center">
                                    <p className="mb-2 text-left text-xs text-text-muted">{t("adminBookings.paymentProof")}</p>
                                    <a
                                        href={getImageUrl(booking.qr_proof_image_url) || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative inline-block overflow-hidden rounded-lg border border-slate-200 transition-all hover:ring-2 ring-brand/50"
                                    >
                                        <img
                                            src={getImageUrl(booking.qr_proof_image_url) || ""}
                                            alt={t("adminBookings.paymentProof")}
                                            className="h-32 w-auto object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                            <span className="text-xs font-medium text-white">{t("adminBookings.clickToOpen")}</span>
                                        </div>
                                    </a>
                                </div>
                            )}
                            {booking.payment_method === "QR" && !booking.qr_proof_image_url && (
                                <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                    {t("adminBookings.noPaymentProof")}
                                </div>
                            )}
                        </div>
                    </div>

                    <ActionButtons />
                </div>

                <BookingEditDialog
                    booking={booking}
                    isOpen={editOpen}
                    onClose={() => setEditOpen(false)}
                    onSaved={() => {
                        onRefresh?.();
                    }}
                />
            </SheetContent>
        </Sheet>
    );
}
