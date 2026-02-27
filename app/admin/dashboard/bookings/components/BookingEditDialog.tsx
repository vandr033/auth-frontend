"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AdminBooking } from "@/types/admin-booking";
import {
    updateBooking,
    getStaff,
    getServices,
    type StaffMember,
    type ServiceItem,
} from "../../../lib/adminApi";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useT } from "@/lib/i18n";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";

interface BookingEditDialogProps {
    booking: AdminBooking;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

type BookingUpdatesPayload = {
    staff_id?: number;
    service_ids?: number[];
    start_at?: string;
    notes?: string | null;
};

export function BookingEditDialog({ booking, isOpen, onClose, onSaved }: BookingEditDialogProps) {
    const t = useT();
    const { role } = useAdminAuth();
    const isStaffRole = role === "STAFF";
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [selectedStaffId, setSelectedStaffId] = useState<number>(booking.staff.id);
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
        booking.services.map((s) => s.id)
    );
    const [date, setDate] = useState(format(parseISO(booking.start_at), "yyyy-MM-dd"));
    const [time, setTime] = useState(format(parseISO(booking.start_at), "HH:mm"));
    const [notes, setNotes] = useState(booking.notes || "");

    // Load staff and services on mount
    useEffect(() => {
        if (!isOpen) return;
        if (isStaffRole) {
            setStaffList([]);
            setServiceList([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        Promise.all([getStaff(), getServices()])
            .then(([staff, services]) => {
                setStaffList(staff);
                setServiceList(services);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [isOpen, isStaffRole]);

    // Reset form when booking changes
    useEffect(() => {
        setSelectedStaffId(booking.staff.id);
        setSelectedServiceIds(booking.services.map((s) => s.id));
        setDate(format(parseISO(booking.start_at), "yyyy-MM-dd"));
        setTime(format(parseISO(booking.start_at), "HH:mm"));
        setNotes(booking.notes || "");
    }, [booking]);

    // Group services by category
    const servicesByCategory = useMemo(() => {
        const groups: Record<string, ServiceItem[]> = {};
        serviceList.forEach((s) => {
            const catName = s.category?.name || "Uncategorized";
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(s);
        });
        return groups;
    }, [serviceList]);

    // Calculate totals
    const { totalPrice, totalDuration } = useMemo(() => {
        const selected = serviceList.filter((s) => selectedServiceIds.includes(s.id));
        return {
            totalPrice: selected.reduce((sum, s) => sum + s.price_cents, 0),
            totalDuration: selected.reduce((sum, s) => sum + s.duration_minutes, 0),
        };
    }, [serviceList, selectedServiceIds]);

    const toggleService = (serviceId: number) => {
        setSelectedServiceIds((prev) =>
            prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
        );
    };

    const handleSave = async () => {
        if (!isStaffRole && selectedServiceIds.length === 0) {
            setError(t('adminBookings.selectOneService'));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const startAt = new Date(`${date}T${time}`).toISOString();

            const updates: BookingUpdatesPayload = {};
            const normalizedNotes = notes.trim();
            const currentNotes = (booking.notes || "").trim();

            // Only send changed fields
            if (!isStaffRole && selectedStaffId !== booking.staff.id) {
                updates.staff_id = selectedStaffId;
            }

            if (!isStaffRole) {
                const originalServiceIds = booking.services.map((s) => s.id).sort().join(",");
                const newServiceIds = [...selectedServiceIds].sort().join(",");
                if (originalServiceIds !== newServiceIds) {
                    updates.service_ids = selectedServiceIds;
                }
            }

            const originalStartAt = booking.start_at;
            if (startAt !== originalStartAt) {
                updates.start_at = startAt;
            }

            if (normalizedNotes !== currentNotes) {
                updates.notes = normalizedNotes.length > 0 ? normalizedNotes : null;
            }

            if (Object.keys(updates).length === 0) {
                onClose();
                return;
            }

            await updateBooking(booking.id, updates);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save booking');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{`${t('adminBookings.editBooking')} #${booking.id}`}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-brand" />
                    </div>
                ) : (
                    <div className="space-y-5">
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="edit-date">{t('adminBookings.date')}</Label>
                                <Input
                                    id="edit-date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-time">{t('adminBookings.time')}</Label>
                                <Input
                                    id="edit-time"
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Staff */}
                        {!isStaffRole && (
                            <div>
                                <Label>{t('adminBookings.staffMember')}</Label>
                                <Select
                                    value={String(selectedStaffId)}
                                    onValueChange={(val) => setSelectedStaffId(Number(val))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('adminBookings.selectStaff')} />
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

                        {/* Services */}
                        {!isStaffRole && (
                            <div>
                                <Label>{t('shopBooking.services')}</Label>
                                <div className="mt-2 space-y-4 max-h-60 overflow-y-auto border rounded-md p-3">
                                    {Object.entries(servicesByCategory).map(([category, services]) => (
                                        <div key={category}>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                {category}
                                            </p>
                                            <div className="space-y-2">
                                                {services.map((service) => (
                                                    <label
                                                        key={service.id}
                                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                                                    >
                                                        <Checkbox
                                                            checked={selectedServiceIds.includes(service.id)}
                                                            onCheckedChange={() => toggleService(service.id)}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium">{service.name}</span>
                                                            <span className="text-xs text-slate-500 ml-2">
                                                                {t('shopBooking.duration', { minutes: service.duration_minutes })}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-slate-600">
                                                            ${(service.price_cents / 100).toFixed(2)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="edit-notes">{t('adminBookings.notes')}</Label>
                            <Input
                                id="edit-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('adminBookings.notes')}
                            />
                        </div>

                        {/* Summary */}
                        {!isStaffRole && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="text-sm text-slate-600">
                                    {t('adminBookings.servicesSummary', { count: selectedServiceIds.length, duration: totalDuration })}
                                </div>
                                <div className="text-lg font-bold text-slate-900">
                                    ${(totalPrice / 100).toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {t('adminBookings.saveChanges')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
