"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    CalendarClock,
    CheckCircle2,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
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
import { canUsePlanFeature, getStaffLimitForPlan, resolveShopPlan } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import {
    ActionMenu,
    AdminPageHeader,
    AdminPageShell,
    ConfirmDialog,
    DataTable,
    DataToolbar,
    EmptyState,
    LoadingSkeleton,
    StatusBadge,
    StatCard,
} from "@/components/admin/shared";

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
    resource_type?: 'PERSON' | 'ROOM' | 'EQUIPMENT';
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
    resource_type: 'PERSON' | 'ROOM' | 'EQUIPMENT';
    service_ids: number[];
    start_date: string;
    end_date: string;
}

type StaffRosterStatus = "active" | "pending" | "inactive" | "scheduled" | "expired";

type StaffResourceFilter = "all" | "PERSON" | "ROOM" | "EQUIPMENT";

type StaffBookableFilter = "all" | "bookable" | "not-bookable";

const initialFormData: StaffFormData = {
    email: "",
    role: "STAFF",
    phone_prefix: "591",
    phone: "",
    display_name: "",
    bio: "",
    is_bookable: true,
    resource_type: "PERSON",
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

function isPastDate(value?: string | null): boolean {
    return Boolean(value && new Date(value) < new Date());
}

function isFutureDate(value?: string | null): boolean {
    return Boolean(value && new Date(value) > new Date());
}

function formatShortDate(value?: string | null): string | null {
    if (!value) return null;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getStaffRosterStatus(member: Staff): StaffRosterStatus {
    if (isPastDate(member.end_date)) return "expired";
    if (isFutureDate(member.start_date)) return "scheduled";
    if (member.status === "PENDING") return "pending";
    if (member.status === "INACTIVE" || member.is_active === false) return "inactive";
    return "active";
}

export default function StaffPage() {
    const { companyId, isAuthenticated, loading: authLoading, role: currentRole, companyUser, user } = useAdminAuth();
    const t = useT();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const maxStaffMembers = getStaffLimitForPlan(plan);
    const canManageRoles = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "ROLES_PERMISSIONS");

    // State
    const [staff, setStaff] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]); // New state for services
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [resourceFilter, setResourceFilter] = useState<StaffResourceFilter>("all");
    const [bookableFilter, setBookableFilter] = useState<StaffBookableFilter>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | StaffRosterStatus>("all");

    // Editor state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState<StaffFormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);


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

    const servicesById = useMemo(() => {
        return new Map(services.map((service) => [service.id, service]));
    }, [services]);

    const getResourceTypeLabel = useCallback((type?: Staff["resource_type"]) => {
        if (type === "ROOM") return t("adminStaff.resourceTypeRoom");
        if (type === "EQUIPMENT") return t("adminStaff.resourceTypeEquipment");
        return t("adminStaff.resourceTypePerson");
    }, [t]);

    const getStatusLabel = useCallback((status: StaffRosterStatus) => {
        const labels: Record<StaffRosterStatus, string> = {
            active: t("adminStaff.statusActive"),
            pending: t("adminStaff.statusPending"),
            inactive: t("adminStaff.statusInactive"),
            scheduled: t("adminStaff.statusScheduled"),
            expired: t("adminStaff.statusExpired"),
        };
        return labels[status];
    }, [t]);

    const getStatusTone = (status: StaffRosterStatus) => {
        const tones: Record<StaffRosterStatus, "success" | "warning" | "neutral" | "info" | "danger"> = {
            active: "success",
            pending: "warning",
            inactive: "neutral",
            scheduled: "info",
            expired: "danger",
        };
        return tones[status];
    };

    const getAvailabilityLabel = useCallback((member: Staff) => {
        if (isPastDate(member.end_date)) return t("adminStaff.availabilityEnded", { date: formatShortDate(member.end_date) || "" });
        if (isFutureDate(member.start_date)) return t("adminStaff.availabilityStarts", { date: formatShortDate(member.start_date) || "" });
        if (member.end_date) return t("adminStaff.availabilityEnds", { date: formatShortDate(member.end_date) || "" });
        return t("adminStaff.availabilityOpen");
    }, [t]);

    const getServiceCoverage = useCallback((member: Staff) => {
        const assigned = member.services || [];
        if (assigned.length === 0) return t("adminStaff.noServicesAssigned");
        const firstNames = assigned
            .slice(0, 2)
            .map((id) => servicesById.get(id)?.name)
            .filter(Boolean);
        const remainder = Math.max(0, assigned.length - firstNames.length);
        return remainder > 0
            ? `${firstNames.join(", ")} +${remainder}`
            : firstNames.join(", ");
    }, [servicesById, t]);

    const filteredStaff = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return staff.filter((member) => {
            const status = getStaffRosterStatus(member);
            const searchable = [
                member.display_name,
                member.user?.email,
                getResourceTypeLabel(member.resource_type),
                getServiceCoverage(member),
            ].filter(Boolean).join(" ").toLowerCase();

            if (query && !searchable.includes(query)) return false;
            if (resourceFilter !== "all" && (member.resource_type || "PERSON") !== resourceFilter) return false;
            if (bookableFilter === "bookable" && !member.is_bookable) return false;
            if (bookableFilter === "not-bookable" && member.is_bookable) return false;
            if (statusFilter !== "all" && status !== statusFilter) return false;
            return true;
        });
    }, [bookableFilter, getResourceTypeLabel, getServiceCoverage, resourceFilter, searchQuery, staff, statusFilter]);
    const isStaffLimitReached = maxStaffMembers !== null && staff.length >= maxStaffMembers;
    const bookableCount = staff.filter((member) => member.is_bookable).length;
    const pendingCount = staff.filter((member) => getStaffRosterStatus(member) === "pending").length;
    const inactiveCount = staff.filter((member) => ["inactive", "expired"].includes(getStaffRosterStatus(member))).length;

    // Open editor for add/edit
    const openAddModal = () => {
        if (isStaffLimitReached) {
            void notify.warning(t("planEnforcement.staffLimitReached"));
            return;
        }

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
            resource_type: member.resource_type || "PERSON",
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
        if (!editingStaff && canManageRoles && !["OWNER", "ADMIN", "STAFF"].includes(formData.role)) {
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
                resource_type: formData.resource_type,
                company_id: companyId,
                ...(editingStaff ? {} : {
                    email: formData.email.trim(),
                    role: canManageRoles ? formData.role : "STAFF",
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

    const handleResendInvite = async (member: Staff) => {
        if (member.status !== "PENDING") return;

        setResendingInviteId(member.id);
        try {
            const response = await fetch(getApiUrl(`/api/admin/staff/${member.id}/resend-invite`), {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.message || data?.error || t("adminStaff.resendInviteFailed"));
            }

            await notify.success(t("adminStaff.resendInviteSuccess"));
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("adminStaff.resendInviteFailed"));
        } finally {
            setResendingInviteId(null);
        }
    };

    const renderMemberIdentity = (member: Staff) => (
        <div className="flex min-w-0 items-center gap-3">
            {member.image_url ? (
                <img
                    src={getImageUrl(member.image_url) || ""}
                    alt={member.display_name}
                    className="h-10 w-10 rounded-lg object-cover"
                />
            ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin-brand-soft text-sm font-semibold text-admin-brand-soft-text">
                    {getInitials(member.display_name)}
                </div>
            )}
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">{member.display_name}</p>
                </div>
                <p className="truncate text-xs text-slate-500">
                    {member.user?.email || t("adminStaff.noEmail")}
                </p>
            </div>
        </div>
    );

    const renderStatus = (member: Staff) => {
        const status = getStaffRosterStatus(member);
        return (
            <div className="flex flex-col items-start gap-1.5">
                <StatusBadge tone={getStatusTone(status)} dot>
                    {getStatusLabel(status)}
                </StatusBadge>
                <span className="text-xs text-slate-500">{getAvailabilityLabel(member)}</span>
            </div>
        );
    };

    const renderActions = (member: Staff) => (
        <div className="flex items-center justify-end gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(member)}
                className="h-8 gap-1.5"
            >
                <Pencil className="h-3.5 w-3.5" />
                {t("meProfile.edit")}
            </Button>
            <ActionMenu
                label={t("adminStaff.memberActions")}
                items={[
                    ...(member.status === "PENDING"
                        ? [{
                            label: t("adminStaff.resendInvite"),
                            icon: resendingInviteId === member.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <RefreshCw className="h-4 w-4" />,
                            disabled: resendingInviteId === member.id,
                            onSelect: () => void handleResendInvite(member),
                        }]
                        : []),
                    {
                        label: t("adminStaff.removeStaff"),
                        icon: <Trash2 className="h-4 w-4" />,
                        destructive: true,
                        separatorBefore: member.status === "PENDING",
                        onSelect: () => {
                            setDeletingStaff(member);
                            setIsDeleteDialogOpen(true);
                        },
                    },
                ]}
            />
        </div>
    );

    const renderMobileMember = (member: Staff) => (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                {renderMemberIdentity(member)}
                {renderStatus(member)}
            </div>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t("adminStaff.resourceType")}</span>
                    <span className="font-medium text-slate-800">{getResourceTypeLabel(member.resource_type)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t("adminStaff.assignedServices")}</span>
                    <span className="max-w-[60%] truncate text-right font-medium text-slate-800">{getServiceCoverage(member)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t("adminStaff.bookable")}</span>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", member.is_bookable ? "text-emerald-700" : "text-slate-500")}>
                            {member.is_bookable ? t("superAdminShops.yes") : t("superAdminShops.no")}
                        </span>
                        <Switch checked={member.is_bookable} onCheckedChange={() => void toggleBookable(member)} />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2">
                {renderActions(member)}
            </div>
        </div>
    );

    // Loading state
    if (authLoading || loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={5} variant="table" />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t('adminStaff.title')}
                subtitle={t('adminStaff.subtitle')}
                meta={(
                    <span>
                        {staff.length}
                        {maxStaffMembers !== null ? ` / ${maxStaffMembers}` : ""}
                        {" "}
                        {t("adminStaff.rosterSlots")}
                    </span>
                )}
                actions={
                    <Button
                        onClick={openAddModal}
                        className="bg-admin-brand text-white hover:bg-admin-brand-hover"
                        disabled={isStaffLimitReached}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('adminStaff.inviteStaff')}
                    </Button>
                }
            />

            <div className="grid gap-3 md:grid-cols-3">
                <StatCard
                    label={t("adminStaff.totalMembers")}
                    value={staff.length}
                    hint={t("adminStaff.totalMembersHint")}
                    icon={<UserRound className="h-5 w-5" />}
                />
                <StatCard
                    label={t("adminStaff.bookableMembers")}
                    value={bookableCount}
                    hint={t("adminStaff.bookableMembersHint")}
                    icon={<CalendarClock className="h-5 w-5" />}
                />
                <StatCard
                    label={t("adminStaff.needsAttention")}
                    value={pendingCount + inactiveCount}
                    hint={t("adminStaff.needsAttentionHint", { pending: pendingCount, inactive: inactiveCount })}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                />
            </div>

            {isStaffLimitReached && (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.staffLimitReached")}
                />
            )}
            {!canManageRoles && (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnBusiness")}
                    feature="ROLES_PERMISSIONS"
                />
            )}

            <DataToolbar
                searchValue={searchQuery}
                searchPlaceholder={t("adminStaff.searchPlaceholder")}
                onSearchChange={setSearchQuery}
                summary={t("adminStaff.showingMembers", { count: filteredStaff.length, total: staff.length })}
                filters={(
                    <>
                        <Select value={resourceFilter} onValueChange={(value) => setResourceFilter(value as StaffResourceFilter)}>
                            <SelectTrigger className="h-9 w-full sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminStaff.allResourceTypes")}</SelectItem>
                                <SelectItem value="PERSON">{t("adminStaff.resourceTypePerson")}</SelectItem>
                                <SelectItem value="ROOM">{t("adminStaff.resourceTypeRoom")}</SelectItem>
                                <SelectItem value="EQUIPMENT">{t("adminStaff.resourceTypeEquipment")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={bookableFilter} onValueChange={(value) => setBookableFilter(value as StaffBookableFilter)}>
                            <SelectTrigger className="h-9 w-full sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminStaff.allBookableStates")}</SelectItem>
                                <SelectItem value="bookable">{t("adminStaff.onlyBookable")}</SelectItem>
                                <SelectItem value="not-bookable">{t("adminStaff.onlyNotBookable")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | StaffRosterStatus)}>
                            <SelectTrigger className="h-9 w-full sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminStaff.allStatuses")}</SelectItem>
                                <SelectItem value="active">{t("adminStaff.statusActive")}</SelectItem>
                                <SelectItem value="pending">{t("adminStaff.statusPending")}</SelectItem>
                                <SelectItem value="scheduled">{t("adminStaff.statusScheduled")}</SelectItem>
                                <SelectItem value="inactive">{t("adminStaff.statusInactive")}</SelectItem>
                                <SelectItem value="expired">{t("adminStaff.statusExpired")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                )}
            />

            <DataTable
                data={filteredStaff}
                getRowKey={(member) => member.id}
                mobileBreakpoint="lg"
                renderMobileItem={renderMobileMember}
                empty={(
                    <EmptyState
                        icon={UserRound}
                        title={searchQuery || resourceFilter !== "all" || bookableFilter !== "all" || statusFilter !== "all"
                            ? t("adminStaff.noFilteredStaffTitle")
                            : t("adminStaff.noStaffTitle")}
                        description={searchQuery || resourceFilter !== "all" || bookableFilter !== "all" || statusFilter !== "all"
                            ? t("adminStaff.noFilteredStaffDesc")
                            : t("adminStaff.noStaff")}
                        action={!isStaffLimitReached ? (
                            <Button onClick={openAddModal} className="bg-admin-brand text-white hover:bg-admin-brand-hover">
                                <Plus className="mr-2 h-4 w-4" />
                                {t("adminStaff.inviteStaff")}
                            </Button>
                        ) : null}
                    />
                )}
                columns={[
                    {
                        key: "member",
                        header: t("adminStaff.member"),
                        cell: (member) => renderMemberIdentity(member),
                        className: "min-w-[240px]",
                    },
                    {
                        key: "type",
                        header: t("adminStaff.resourceType"),
                        cell: (member) => (
                            <StatusBadge tone="neutral">
                                {getResourceTypeLabel(member.resource_type)}
                            </StatusBadge>
                        ),
                    },
                    {
                        key: "status",
                        header: t("adminStaff.availability"),
                        cell: (member) => renderStatus(member),
                    },
                    {
                        key: "services",
                        header: t("adminStaff.assignedServices"),
                        cell: (member) => (
                            <div className="max-w-xs">
                                <p className="truncate text-sm font-medium text-slate-800">{getServiceCoverage(member)}</p>
                                <p className="text-xs text-slate-500">
                                    {t("adminStaff.servicesCount", { count: member.services?.length || 0 })}
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: "bookable",
                        header: t("adminStaff.bookable"),
                        cell: (member) => (
                            <div className="flex items-center gap-2">
                                <Switch checked={member.is_bookable} onCheckedChange={() => void toggleBookable(member)} />
                                <span className={cn("text-xs font-medium", member.is_bookable ? "text-emerald-700" : "text-slate-500")}>
                                    {member.is_bookable ? t("superAdminShops.yes") : t("superAdminShops.no")}
                                </span>
                            </div>
                        ),
                    },
                    {
                        key: "actions",
                        header: <span className="sr-only">{t("adminStaff.memberActions")}</span>,
                        cell: (member) => renderActions(member),
                        className: "text-right",
                    },
                ]}
            />

            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
                <SheetContent className="w-full gap-0 overflow-hidden bg-page p-0 sm:max-w-2xl lg:max-w-4xl">
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4 pr-14 text-left">
                            <SheetTitle>
                                {editingStaff
                                    ? t('adminStaff.editStaff', { name: editingStaff.display_name })
                                    : t('adminStaff.addNewStaff')}
                            </SheetTitle>
                            <SheetDescription>
                                {editingStaff
                                    ? t('adminStaff.updateStaffDetails')
                                    : t('adminStaff.inviteStaffByEmail')}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                            <div className="mx-auto flex max-w-2xl flex-col gap-4">
                                {formError && (
                                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                        {formError}
                                    </div>
                                )}

                                {!editingStaff && (
                                    <section className="admin-card">
                                        <div className="border-b border-slate-100 px-4 py-3">
                                            <h3 className="text-sm font-semibold text-slate-950">{t('adminStaff.inviteStaff')}</h3>
                                        </div>
                                        <div className="space-y-4 p-4">
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

                                            {canManageRoles && (
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
                                                <div className="col-span-2 space-y-2">
                                                    <Label htmlFor="phone">{t("adminCustomers.phone")}</Label>
                                                    <Input
                                                        id="phone"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                        placeholder="70000000"
                                                    />
                                                </div>
                                            </div>

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
                                        </div>
                                    </section>
                                )}

                                <section className="admin-card">
                                    <div className="border-b border-slate-100 px-4 py-3">
                                        <h3 className="text-sm font-semibold text-slate-950">{t('adminStaff.name')}</h3>
                                    </div>
                                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="display_name">{t('adminStaff.name')} *</Label>
                                            <Input
                                                id="display_name"
                                                value={formData.display_name}
                                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                                placeholder={t('adminStaff.namePlaceholder')}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="resource_type">{t('adminStaff.resourceType')}</Label>
                                            <Select
                                                value={formData.resource_type}
                                                onValueChange={(value: 'PERSON' | 'ROOM' | 'EQUIPMENT') =>
                                                    setFormData({ ...formData, resource_type: value })
                                                }
                                            >
                                                <SelectTrigger id="resource_type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PERSON">{t('adminStaff.resourceTypePerson')}</SelectItem>
                                                    <SelectItem value="ROOM">{t('adminStaff.resourceTypeRoom')}</SelectItem>
                                                    <SelectItem value="EQUIPMENT">{t('adminStaff.resourceTypeEquipment')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
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

                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="bio">{t('adminStaff.bio')}</Label>
                                            <textarea
                                                id="bio"
                                                value={formData.bio}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                placeholder={t('adminStaff.bioPlaceholder')}
                                                className="admin-textarea h-28 resize-none"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="admin-card">
                                    <div className="border-b border-slate-100 px-4 py-3">
                                        <h3 className="text-sm font-semibold text-slate-950">{t('adminStaff.assignedServices')}</h3>
                                    </div>
                                    <div className="p-4">
                                        {services.length === 0 ? (
                                            <p className="text-sm italic text-slate-500">{t('adminStaff.noServicesHint')}</p>
                                        ) : (
                                            <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-slate-200 p-2">
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
                                                                <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-slate-50">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.service_ids.includes(service.id)}
                                                                        onChange={() => toggleService(service.id)}
                                                                        className="h-4 w-4 rounded border-slate-300 text-admin-brand-hover focus:ring-admin-brand"
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
                                </section>

                                <section className="admin-card">
                                    <div className="border-b border-slate-100 px-4 py-3">
                                        <h3 className="text-sm font-semibold text-slate-950">{t('adminStaff.photo')}</h3>
                                    </div>
                                    <div className="p-4">
                                        <div className="max-w-xs">
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
                                </section>
                            </div>
                        </div>

                        <SheetFooter className="border-t border-slate-200 bg-white px-5 py-3">
                            <div className="mx-auto flex w-full max-w-2xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                                    className="bg-admin-brand hover:bg-admin-brand-hover"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('adminServices.saving')}
                                        </>
                                    ) : editingStaff ? (
                                        t('adminStaff.updateStaff')
                                    ) : (
                                        t('adminStaff.addStaff')
                                    )}
                                </Button>
                            </div>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) setDeletingStaff(null);
                }}
                title={t('adminStaff.removeStaff')}
                description={t('adminStaff.deleteConfirm')}
                confirmLabel={submitting ? t('superAdminShops.removing') : t('adminStaff.removeStaff')}
                cancelLabel={t('common.cancel')}
                variant="destructive"
                loading={submitting}
                onConfirm={handleDelete}
            />
        </AdminPageShell>
    );
}
