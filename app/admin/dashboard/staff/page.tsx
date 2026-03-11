"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    Mail,
    Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { getImageUrl } from "@/utils/image-url";
import { notify } from "@/lib/notify";

// Types
// Types
interface Service {
    id: number;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number | string;
    is_active: boolean;
    category?: {
        id: number;
        name: string;
    };
}

interface Staff {
    id: number;
    user_id: string;
    company_id: number;
    display_name: string;
    bio: string;
    image_url: string | null;
    is_bookable: boolean;
    is_active: boolean;
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE';
    start_date?: string | null;
    end_date?: string | null;
    services?: number[]; // IDs of services this staff member can perform
    user?: {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
    };
}

interface StaffFormData {
    email: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    phone_prefix: string;
    phone: string;
    display_name: string;
    bio: string;
    is_bookable: boolean;
    service_ids: number[];
    start_date: string;
    end_date: string;
}

const initialFormData: StaffFormData = {
    email: "",
    role: "STAFF",
    phone_prefix: "591",
    phone: "",
    display_name: "",
    bio: "",
    is_bookable: true,
    service_ids: [],
    start_date: "",
    end_date: "",
};

// Helper function to get initials
function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function StaffPage() {
    const { companyId, isAuthenticated, loading: authLoading, role: currentRole } = useAdminAuth();
    const t = useT();

    // State
    const [staff, setStaff] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]); // New state for services
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState<StaffFormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);


    // Fetch staff and services
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);

        try {
            const [staffRes, servicesRes] = await Promise.all([
                fetch(getApiUrl(`/api/admin/staff?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/services?company_id=${companyId}`), {
                    credentials: "include",
                }),
            ]);

            if (!staffRes.ok) throw new Error(t('adminStaff.fetchStaffError'));
            // Don't fail hard if services fail, just provide empty list
            // if (!servicesRes.ok) throw new Error("Failed to fetch services");

            const staffData = await staffRes.json();
            const servicesData = servicesRes.ok ? await servicesRes.json() : { data: [] };

            setStaff(staffData.data || staffData || []);
            setServices(servicesData.data || servicesData || []);
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t('adminStaff.loadDataError'));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Filtered staff
    const filteredStaff = staff.filter((member) =>
        member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Open modal for add/edit
    const openAddModal = () => {
        setEditingStaff(null);
        setFormData(initialFormData);
        setFormError(null);
        setSelectedImage(null);
        setPreviewImage(null);
        setIsModalOpen(true);
    };

    const openEditModal = (member: Staff) => {
        setEditingStaff(member);
        setFormData({
            email: member.user?.email || "",
            role: "STAFF",
            phone_prefix: "591",
            phone: "",
            display_name: member.display_name,
            bio: member.bio || "",
            is_bookable: member.is_bookable,
            service_ids: member.services || [],
            start_date: member.start_date ? member.start_date.split('T')[0] : "",
            end_date: member.end_date ? member.end_date.split('T')[0] : "",
        });
        setFormError(null);
        setSelectedImage(null);
        setPreviewImage(member.image_url || null);
        setIsModalOpen(true);
    };

    // Helper to toggle a service in the list
    const toggleService = (serviceId: number) => {
        setFormData(prev => ({
            ...prev,
            service_ids: prev.service_ids.includes(serviceId)
                ? prev.service_ids.filter(id => id !== serviceId)
                : [...prev.service_ids, serviceId]
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;

        // Validation
        if (!formData.display_name.trim()) {
            setFormError(t('adminStaff.displayNameRequired'));
            return;
        }
        if (!editingStaff && !formData.email.trim()) {
            setFormError(t('adminStaff.emailRequiredInvite'));
            return;
        }
        if (!editingStaff && !["OWNER", "ADMIN", "STAFF"].includes(formData.role)) {
            setFormError(t("superAdminShops.roleRequiredLabel"));
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            // STEP 1: Create or Update Staff Basic Info
            const payload = {
                display_name: formData.display_name.trim(),
                bio: formData.bio.trim(),
                is_bookable: formData.is_bookable,
                company_id: companyId,
                ...(editingStaff ? {} : {
                    email: formData.email.trim(),
                    role: formData.role,
                    phone_prefix: formData.phone_prefix.trim() || undefined,
                    phone: formData.phone.trim() || undefined,
                    service_ids: formData.service_ids,
                    ...(formData.start_date ? { start_date: formData.start_date } : {}),
                    ...(formData.end_date ? { end_date: formData.end_date } : {}),
                }),
            };

            const url = editingStaff
                ? getApiUrl(`/api/admin/staff/${editingStaff.id}`)
                : getApiUrl("/api/admin/staff");

            const response = await fetch(url, {
                method: editingStaff ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || t('adminStaff.saveStaffError'));
            }

            const savedStaff = await response.json();
            const staffId = savedStaff.data?.id || savedStaff.id;

            // STEP 2: Update Services (Only for Edit)
            // For Create, it's sent in the payload above.
            if (editingStaff) {
                const servicesRes = await fetch(getApiUrl(`/api/admin/staff/${staffId}/services`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ service_ids: formData.service_ids }),
                });

                if (!servicesRes.ok) {
                    console.error("Failed to update staff services");
                }
            }

            // STEP 3: Handle Image Upload if selected
            if (selectedImage && staffId) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedImage);
                imageFormData.append('company_id', companyId.toString());
                imageFormData.append('type', 'staff');
                imageFormData.append('entity_id', staffId.toString());

                const uploadRes = await fetch(getApiUrl('/api/admin/uploads/image'), {
                    method: 'POST',
                    body: imageFormData,
                    credentials: 'include',
                });

                if (!uploadRes.ok) {
                    // Don't fail the whole operation, just warn
                    console.error("Failed to upload staff image");
                    // You might want to show a warning toast here
                }
            }

            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t('adminStaff.saveStaffError'));
        } finally {
            setSubmitting(false);
        }
    };

    const servicesByCategory = useMemo(() => {
        const grouped = new Map<string, { key: string; name: string; services: Service[] }>();

        for (const service of services) {
            const categoryName = service.category?.name || t("adminServices.uncategorized");
            const categoryKey = service.category?.id
                ? `category-${service.category.id}`
                : "category-uncategorized";

            if (!grouped.has(categoryKey)) {
                grouped.set(categoryKey, {
                    key: categoryKey,
                    name: categoryName,
                    services: [],
                });
            }

            grouped.get(categoryKey)?.services.push(service);
        }

        return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [services, t]);

    // Handle delete
    const handleDelete = async () => {
        if (!deletingStaff) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/admin/staff/${deletingStaff.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) throw new Error(t('adminStaff.deleteFailed'));

            setIsDeleteDialogOpen(false);
            setDeletingStaff(null);
            await fetchData();
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t('adminStaff.deleteFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle bookable status
    const toggleBookable = async (member: Staff) => {
        try {
            const response = await fetch(getApiUrl(`/api/admin/staff/${member.id}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ is_bookable: !member.is_bookable }),
            });

            if (!response.ok) throw new Error(t('adminStaff.updateStatusFailed'));

            setStaff((prev) =>
                prev.map((s) =>
                    s.id === member.id ? { ...s, is_bookable: !s.is_bookable } : s
                )
            );
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t('adminStaff.updateStatusFailed'));
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-slate-600">{t('common.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('adminStaff.title')}</h1>
                    <p className="text-slate-500">{t('adminStaff.subtitle')}</p>
                </div>
                <Button onClick={openAddModal} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('adminStaff.inviteStaff')}
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t('adminStaff.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Staff Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.length === 0 ? (
                    <Card className="sm:col-span-2 lg:col-span-3">
                        <CardContent className="py-12 text-center text-slate-500">
                            {t('adminStaff.noStaff')}
                        </CardContent>
                    </Card>
                ) : (
                    filteredStaff.map((member) => (
                        <Card key={member.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                {/* Card Header with Photo */}
                                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 flex items-center gap-4">
                                    {member.image_url ? (
                                        <img
                                            src={getImageUrl(member.image_url) || ""}
                                            alt={member.display_name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-semibold border-2 border-white/30">
                                            {getInitials(member.display_name)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-white truncate">
                                                {member.display_name}
                                            </h3>
                                            {member.status === 'PENDING' && (
                                                <Badge className="bg-amber-400 text-amber-900 text-[10px] px-1.5 py-0">
                                                    {t('adminBookings.pending')}
                                                </Badge>
                                            )}
                                            {member.status === 'INACTIVE' && (
                                                <Badge className="bg-gray-400 text-gray-900 text-[10px] px-1.5 py-0">
                                                    {t('adminServices.inactive')}
                                                </Badge>
                                            )}
                                            {member.end_date && new Date(member.end_date) < new Date() && (
                                                <Badge className="bg-rose-400 text-rose-900 text-[10px] px-1.5 py-0">
                                                    {t('adminStaff.expired')}
                                                </Badge>
                                            )}
                                            {member.start_date && new Date(member.start_date) > new Date() && (
                                                <Badge className="bg-blue-400 text-blue-900 text-[10px] px-1.5 py-0">
                                                    {t('adminStaff.startsOn', { date: new Date(member.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })}
                                                </Badge>
                                            )}
                                        </div>
                                        {member.user?.email && (
                                            <p className="text-white/80 text-sm truncate flex items-center gap-1">
                                                <Mail className="h-3 w-3 flex-shrink-0" />
                                                {member.user.email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-4">
                                    {/* Bio Preview */}
                                    {member.bio ? (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {member.bio}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">
                                            {t('adminStaff.noBioProvided')}
                                        </p>
                                    )}

                                    {/* Bookable Toggle */}
                                    <div className="flex items-center justify-between py-2 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm text-slate-600">{t('adminStaff.bookable')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "text-xs font-medium",
                                                    member.is_bookable ? "text-emerald-600" : "text-slate-400"
                                                )}
                                                >
                                                {member.is_bookable ? t('superAdminShops.yes') : t('superAdminShops.no')}
                                            </span>
                                            <Switch
                                                checked={member.is_bookable}
                                                onCheckedChange={() => toggleBookable(member)}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(member)}
                                            className="flex-1"
                                        >
                                            <Pencil className="h-4 w-4 mr-1" />
                                            {t('meProfile.edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingStaff(member);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Add/Edit Staff Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStaff
                                ? t('adminStaff.editStaff', { name: editingStaff.display_name })
                                : t('adminStaff.addNewStaff')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingStaff
                                ? t('adminStaff.updateStaffDetails')
                                : t('adminStaff.inviteStaffByEmail')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {formError}
                            </div>
                        )}

                        {/* Email - only for new staff */}
                        {!editingStaff && (
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('adminStaff.email')} *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder={t('adminStaff.emailPlaceholder')}
                                />
                                <p className="text-xs text-slate-500">
                                    {t('adminStaff.inviteHint')}
                                </p>
                            </div>
                        )}

                        {!editingStaff && (
                            <div className="space-y-2">
                                <Label htmlFor="role">{t("superAdminShops.roleRequiredLabel")}</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: "OWNER" | "ADMIN" | "STAFF") =>
                                        setFormData({ ...formData, role: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currentRole === "OWNER" && (
                                            <SelectItem value="OWNER">{t("superAdminShops.roleOwner")}</SelectItem>
                                        )}
                                        <SelectItem value="ADMIN">{t("superAdminShops.roleAdmin")}</SelectItem>
                                        <SelectItem value="STAFF">{t("superAdminShops.roleStaff")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {!editingStaff && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="phone_prefix">{t("superAdminShops.countryCode")}</Label>
                                    <Input
                                        id="phone_prefix"
                                        value={formData.phone_prefix}
                                        onChange={(e) => setFormData({ ...formData, phone_prefix: e.target.value })}
                                        placeholder="591"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="phone">{t("adminCustomers.phone")}</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="70000000"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="display_name">{t('adminStaff.name')} *</Label>
                            <Input
                                id="display_name"
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder={t('adminStaff.namePlaceholder')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">{t('adminStaff.bio')}</Label>
                            <textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder={t('adminStaff.bioPlaceholder')}
                                className="w-full h-24 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        {/* Date Range (for new staff) */}
                        {!editingStaff && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">{t('adminStaff.startDate')}</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500">{t('common.optional')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">{t('adminStaff.endDate')}</Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500">{t('common.optional')}</p>
                                </div>
                            </div>
                        )}

                        {/* Service Selection */}
                        <div className="space-y-2">
                            <Label>{t('adminStaff.assignedServices')}</Label>
                            {services.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">{t('adminStaff.noServicesHint')}</p>
                            ) : (
                                <div className="max-h-56 overflow-y-auto border rounded-md p-2 space-y-3">
                                    {servicesByCategory.map((group) => (
                                        <div key={group.key} className="space-y-1">
                                            <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {group.name}
                                            </p>
                                            {group.services.length === 0 ? (
                                                <p className="px-2 pb-2 text-xs text-slate-400">
                                                    {t("adminStaff.emptyCategoryServices")}
                                                </p>
                                            ) : (
                                                group.services.map((service) => (
                                                    <label key={service.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.service_ids.includes(service.id)}
                                                            onChange={() => toggleService(service.id)}
                                                            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                                        />
                                                        <span className="text-sm text-slate-700">{service.name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-2">
                            <Label>{t('adminStaff.photo')}</Label>
                            <div className="max-w-xs mx-auto sm:mx-0">
                                <ImageUpload
                                    companyId={companyId!}
                                    type="staff"
                                    currentUrl={previewImage}
                                    autoUpload={false}
                                    onFileSelect={(file) => {
                                        setSelectedImage(file);
                                        setPreviewImage(URL.createObjectURL(file));
                                    }}
                                    aspectRatio="1:1"
                                    maxSizeMB={2}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Label htmlFor="is_bookable">{t('adminStaff.bookable')}</Label>
                                <p className="text-xs text-slate-500">
                                    {t('adminStaff.bookableHint')}
                                </p>
                            </div>
                            <Switch
                                id="is_bookable"
                                checked={formData.is_bookable}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_bookable: checked })
                                }
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t('adminServices.saving')}
                                    </>
                                ) : editingStaff ? (
                                    t('adminStaff.updateStaff')
                                ) : (
                                    t('adminStaff.addStaff')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('adminStaff.deleteConfirm')}</DialogTitle>
                        <DialogDescription>
                            {t('adminStaff.deleteConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingStaff(null);
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={submitting}
                            className="bg-rose-500 hover:bg-rose-600"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t('superAdminShops.removing')}
                                </>
                            ) : (
                                t('adminStaff.removeStaff')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
