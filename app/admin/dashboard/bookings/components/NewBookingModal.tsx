"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { StaffMember, ServiceItem, CreateBookingData, ServiceCategory } from "@/app/admin/lib/adminApi";
import { useT } from "@/lib/i18n";

// Re-export for backwards compatibility
export type StaffOption = StaffMember;
export type ServiceOption = ServiceItem;

interface NewBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffList: StaffMember[];
    serviceList: ServiceItem[];
    onCreate: (data: CreateBookingData) => Promise<void>;
}

// Helper to format price from cents
const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
};

export function NewBookingModal({ isOpen, onClose, staffList, serviceList, onCreate }: NewBookingModalProps) {
    const t = useT();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        staffId: "",
        serviceIds: [] as string[],
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
    });

    // Get selected staff member
    const selectedStaff = useMemo(() => {
        if (!formData.staffId) return null;
        return staffList.find(s => s.id.toString() === formData.staffId) || null;
    }, [formData.staffId, staffList]);

    // Filter services based on selected staff's enabled services
    const availableServices = useMemo(() => {
        if (!selectedStaff) return [];

        // If staff has a services array, filter by it
        if (selectedStaff.services && selectedStaff.services.length > 0) {
            return serviceList.filter(service =>
                selectedStaff.services!.includes(service.id) && service.is_active
            );
        }

        // If no services array, show all active services
        return serviceList.filter(service => service.is_active);
    }, [selectedStaff, serviceList]);

    // Group services by category
    const servicesByCategory = useMemo(() => {
        const grouped = new Map<number, { category: ServiceCategory; services: ServiceItem[] }>();

        availableServices
            .sort((a, b) => a.position - b.position)
            .forEach(service => {
                const existing = grouped.get(service.category_id);
                if (existing) {
                    existing.services.push(service);
                } else {
                    grouped.set(service.category_id, {
                        category: service.category,
                        services: [service],
                    });
                }
            });

        // Sort categories by position
        return Array.from(grouped.values()).sort(
            (a, b) => a.category.position - b.category.position
        );
    }, [availableServices]);

    // Clear selected services when staff changes
    const handleStaffChange = (staffId: string) => {
        setFormData(prev => ({
            ...prev,
            staffId,
            serviceIds: [], // Reset services when staff changes
        }));
    };

    const handleServiceToggle = (id: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            serviceIds: checked
                ? [...prev.serviceIds, id]
                : prev.serviceIds.filter(sid => sid !== id)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onCreate({
                staff_id: parseInt(formData.staffId),
                service_ids: formData.serviceIds.map(id => parseInt(id)),
                start_at: `${formData.date}T${formData.time}:00`,
                customer: {
                    full_name: formData.customerName,
                    email: formData.customerEmail,
                    phone: formData.customerPhone,
                }
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('adminBookings.newBooking')}</DialogTitle>
                        <DialogDescription>
                            {t('adminBookings.newBookingDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* 1. Staff */}
                        <div className="grid gap-2">
                            <Label htmlFor="staff">{t('adminBookings.staffMember')}</Label>
                            <Select
                                value={formData.staffId}
                                onValueChange={handleStaffChange}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('adminBookings.selectStaff')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList
                                        .filter(staff => staff.is_bookable)
                                        .map(staff => (
                                            <SelectItem key={staff.id} value={staff.id.toString()}>
                                                {staff.display_name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Services - Grouped by Category */}
                        <div className="grid gap-2">
                            <Label>{t('shopBooking.services')}</Label>
                            {!formData.staffId ? (
                                <p className="text-sm text-muted-foreground p-3 border rounded-md bg-slate-50">
                                    {t('adminBookings.selectStaffToViewServices')}
                                </p>
                            ) : servicesByCategory.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-3 border rounded-md bg-slate-50">
                                    {t('adminBookings.noServicesForStaff')}
                                </p>
                            ) : (
                                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-4 bg-slate-50">
                                    {servicesByCategory.map(({ category, services }) => (
                                        <div key={category.id}>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                                {category.name}
                                            </h4>
                                            <div className="space-y-2">
                                                {services.map((service) => (
                                                    <div key={service.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`svc-${service.id}`}
                                                            checked={formData.serviceIds.includes(service.id.toString())}
                                                            onCheckedChange={(c) => handleServiceToggle(service.id.toString(), c === true)}
                                                        />
                                                        <label
                                                            htmlFor={`svc-${service.id}`}
                                                            className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            <span>{service.name}</span>
                                                            <span className="text-muted-foreground ml-2">
                                                                ({service.duration_minutes}min - ${formatPrice(service.price_cents)})
                                                            </span>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date">{t('adminBookings.date')}</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="time">{t('adminBookings.time')}</Label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* 4. Customer */}
                        <div className="grid gap-4 border-t pt-4">
                            <h4 className="text-sm font-semibold">{t('adminBookings.customerDetails')}</h4>
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminBookings.fullName')}</Label>
                                <Input
                                    id="name"
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('adminSettings.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.customerEmail}
                                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">{t('adminSettings.phone')}</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.customerPhone}
                                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-brand text-white hover:bg-brand-hover"
                            disabled={loading || !formData.staffId || formData.serviceIds.length === 0}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('adminBookings.createBooking')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
