"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    UserRound,
} from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    createStaffMember,
    deleteStaffMember,
    getServices,
    getStaff,
    getStaffById,
    resendStaffInvite,
    type SaveStaffPayload,
    type ServiceItem,
    type StaffMember,
    updateStaffMember,
    updateStaffMemberServices,
    uploadAdminImage,
} from "@/app/admin/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import {
    ActionMenu,
    AdminMetricGrid,
    AdminPageHeader,
    AdminPageShell,
    ConfirmDialog,
    DataTable,
    DataToolbar,
    ErrorState,
    EmptyState,
    LoadingSkeleton,
    StatCard,
    StatusBadge,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { canUseEntitledFeature, getStaffLimitForPlan, type CompanyCapabilities } from "@/lib/plans/capabilities";
import { hasProductCapability } from "@/lib/product-access";
import { cn } from "@/lib/utils";
import { isEntitlementApiError } from "@/lib/api-error";
import { getImageUrl } from "@/utils/image-url";

type StaffRosterStatus = "active" | "pending" | "inactive" | "scheduled" | "expired";
type StaffResourceFilter = "all" | "PERSON" | "ROOM" | "EQUIPMENT";
type StaffBookableFilter = "all" | "bookable" | "not-bookable";

interface StaffFormData {
    email: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    phone_prefix: string;
    phone: string;
    display_name: string;
    bio: string;
    is_bookable: boolean;
    resource_type: "PERSON" | "ROOM" | "EQUIPMENT";
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
    resource_type: "PERSON",
    service_ids: [],
    start_date: "",
    end_date: "",
};

function companyHasBookingModule(capabilities: CompanyCapabilities | null | undefined) {
    return (
        hasProductCapability(capabilities, "RESERVAS_BASE") ||
        hasProductCapability(capabilities, "RESERVAS_PRO")
    );
}

function companyHasActiveCoreProduct(capabilities: CompanyCapabilities | null | undefined) {
    return (
        capabilities?.products?.some(
            (product) =>
                product.isCore &&
                (product.status === "ACTIVE" || product.status === "TRIALING"),
        ) ?? false
    );
}

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function isPastDate(value?: string | null) {
    return Boolean(value && new Date(value) < new Date());
}

function isFutureDate(value?: string | null) {
    return Boolean(value && new Date(value) > new Date());
}

function formatShortDate(value?: string | null, locale = "es") {
    if (!value) return null;
    return new Date(value).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getStaffRosterStatus(member: StaffMember): StaffRosterStatus {
    if (isPastDate(member.end_date)) return "expired";
    if (isFutureDate(member.start_date)) return "scheduled";
    if (member.status === "PENDING") return "pending";
    if (member.status === "INACTIVE") return "inactive";
    return "active";
}

function useStaffHelpers(services: ServiceItem[]) {
    const { t, locale } = useI18n();

    const servicesById = useMemo(
        () => new Map(services.map((service) => [service.id, service])),
        [services],
    );

    const getResourceTypeLabel = useCallback((type?: StaffMember["resource_type"]) => {
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

    const getStatusTone = useCallback((status: StaffRosterStatus) => {
        const tones: Record<StaffRosterStatus, "success" | "warning" | "neutral" | "info" | "danger"> = {
            active: "success",
            pending: "warning",
            inactive: "neutral",
            scheduled: "info",
            expired: "danger",
        };
        return tones[status];
    }, []);

    const getAvailabilityLabel = useCallback((member: StaffMember) => {
        if (isPastDate(member.end_date)) return t("adminStaff.availabilityEnded", { date: formatShortDate(member.end_date, locale) || "" });
        if (isFutureDate(member.start_date)) return t("adminStaff.availabilityStarts", { date: formatShortDate(member.start_date, locale) || "" });
        if (member.end_date) return t("adminStaff.availabilityEnds", { date: formatShortDate(member.end_date, locale) || "" });
        return t("adminStaff.availabilityOpen");
    }, [locale, t]);

    const getServiceCoverage = useCallback((member: StaffMember) => {
        const assigned = member.services || [];
        if (assigned.length === 0) return t("adminStaff.noServicesAssigned");
        const firstNames = assigned
            .slice(0, 2)
            .map((id) => servicesById.get(id)?.name)
            .filter(Boolean);
        const remainder = Math.max(0, assigned.length - firstNames.length);
        return remainder > 0 ? `${firstNames.join(", ")} +${remainder}` : firstNames.join(", ");
    }, [servicesById, t]);

    return {
        servicesById,
        getResourceTypeLabel,
        getStatusLabel,
        getStatusTone,
        getAvailabilityLabel,
        getServiceCoverage,
    };
}

function StaffIdentity({ member }: { member: StaffMember }) {
    const { t } = useI18n();
    return (
        <div className="flex min-w-0 items-center gap-3">
            {member.image_url ? (
                <img src={getImageUrl(member.image_url) || ""} alt={member.display_name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin-brand-soft text-sm font-semibold text-admin-brand-soft-text">
                    {getInitials(member.display_name)}
                </div>
            )}
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{member.display_name}</p>
                <p className="truncate text-xs text-slate-500">{member.user?.email || t("adminStaff.noEmail")}</p>
            </div>
        </div>
    );
}

function StaffAvailabilityStatus({
    member,
    getAvailabilityLabel,
    getStatusLabel,
    getStatusTone,
}: {
    member: StaffMember;
    getAvailabilityLabel: (member: StaffMember) => string;
    getStatusLabel: (status: StaffRosterStatus) => string;
    getStatusTone: (status: StaffRosterStatus) => "success" | "warning" | "neutral" | "info" | "danger";
}) {
    const status = getStaffRosterStatus(member);
    return (
        <div className="flex flex-col items-start gap-1.5">
            <StatusBadge tone={getStatusTone(status)} dot>
                {getStatusLabel(status)}
            </StatusBadge>
            <span className="text-xs text-slate-500">{getAvailabilityLabel(member)}</span>
        </div>
    );
}

function buildEditableFormData(member: StaffMember): StaffFormData {
    return {
        email: member.user?.email || "",
        role: "STAFF",
        phone_prefix: member.user?.phone_prefix || "591",
        phone: member.user?.phoneNumber || "",
        display_name: member.display_name,
        bio: member.bio || "",
        is_bookable: member.is_bookable,
        resource_type: member.resource_type || "PERSON",
        service_ids: member.services || [],
        start_date: member.start_date ? member.start_date.split("T")[0] : "",
        end_date: member.end_date ? member.end_date.split("T")[0] : "",
    };
}

function isReservasServicesEntitlementError(error: unknown) {
    return (
        isEntitlementApiError(error) &&
        (
            error.reason === "PRODUCT_NOT_ACTIVE" ||
            error.capability === "RESERVAS_BASE" ||
            error.capability === "RESERVAS_PRO"
        )
    );
}

async function loadOptionalStaffServices(shouldLoadServices: boolean) {
    if (!shouldLoadServices) {
        return {
            services: [] as ServiceItem[],
            canAssignServices: false,
        };
    }

    try {
        const services = await getServices();
        return {
            services,
            canAssignServices: true,
        };
    } catch (error) {
        if (isReservasServicesEntitlementError(error)) {
            return {
                services: [] as ServiceItem[],
                canAssignServices: false,
            };
        }

        throw error;
    }
}

export function StaffRosterSurface() {
    const { companyUser, user } = useAdminAuth();
    const { t } = useI18n();
    const capabilities = companyUser?.company?.capabilities;
    const maxStaffMembers = getStaffLimitForPlan(companyUser?.company);
    const hasStaffModule =
        Boolean(user?.is_super_admin) ||
        companyHasActiveCoreProduct(capabilities);
    const hasBookingModule =
        Boolean(user?.is_super_admin) ||
        companyHasBookingModule(capabilities);
    const canManageRoles =
        Boolean(user?.is_super_admin) ||
        (hasStaffModule && canUseEntitledFeature(companyUser?.company, "ROLES_PERMISSIONS"));

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [canAssignServices, setCanAssignServices] = useState(hasBookingModule);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [resourceFilter, setResourceFilter] = useState<StaffResourceFilter>("all");
    const [bookableFilter, setBookableFilter] = useState<StaffBookableFilter>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | StaffRosterStatus>("all");
    const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const { getAvailabilityLabel, getResourceTypeLabel, getServiceCoverage, getStatusLabel, getStatusTone } = useStaffHelpers(services);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [staffRows, serviceResult] = await Promise.all([
                getStaff(),
                loadOptionalStaffServices(hasBookingModule),
            ]);
            setStaff(staffRows);
            setServices(serviceResult.services);
            setCanAssignServices(serviceResult.canAssignServices);
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminStaff.loadDataError"));
        } finally {
            setLoading(false);
        }
    }, [hasBookingModule, t]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const filteredStaff = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return staff.filter((member) => {
            const status = getStaffRosterStatus(member);
            const searchable = [
                member.display_name,
                member.user?.email,
                getResourceTypeLabel(member.resource_type),
                canAssignServices ? getServiceCoverage(member) : null,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (query && !searchable.includes(query)) return false;
            if (resourceFilter !== "all" && (member.resource_type || "PERSON") !== resourceFilter) return false;
            if (bookableFilter === "bookable" && !member.is_bookable) return false;
            if (bookableFilter === "not-bookable" && member.is_bookable) return false;
            if (statusFilter !== "all" && status !== statusFilter) return false;
            return true;
        });
    }, [bookableFilter, canAssignServices, getResourceTypeLabel, getServiceCoverage, resourceFilter, searchQuery, staff, statusFilter]);

    const isStaffLimitReached = maxStaffMembers !== null && staff.length >= maxStaffMembers;
    const bookableCount = staff.filter((member) => member.is_bookable).length;
    const pendingCount = staff.filter((member) => getStaffRosterStatus(member) === "pending").length;
    const inactiveCount = staff.filter((member) => ["inactive", "expired"].includes(getStaffRosterStatus(member))).length;

    const toggleBookable = async (member: StaffMember) => {
        try {
            const updated = await updateStaffMember(member.id, { is_bookable: !member.is_bookable });
            setStaff((current) => current.map((item) => (item.id === member.id ? { ...item, is_bookable: updated.is_bookable } : item)));
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminStaff.updateStatusFailed"));
        }
    };

    const handleResendInvite = async (member: StaffMember) => {
        if (member.status !== "PENDING") return;
        setResendingInviteId(member.id);
        try {
            await resendStaffInvite(member.id);
            await notify.success(t("adminStaff.resendInviteSuccess"));
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminStaff.resendInviteFailed"));
        } finally {
            setResendingInviteId(null);
        }
    };

    const handleDelete = async () => {
        if (!deletingStaff) return;
        setSubmittingDelete(true);
        try {
            await deleteStaffMember(deletingStaff.id);
            setDeletingStaff(null);
            await loadData();
        } catch (error: unknown) {
            await notify.error(error instanceof Error ? error.message : t("adminStaff.deleteFailed"));
        } finally {
            setSubmittingDelete(false);
        }
    };

    if (loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={5} variant="table" />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("adminStaff.title")}
                subtitle={t("adminStaff.rosterSubtitle")}
                meta={
                    <span>
                        {staff.length}
                        {maxStaffMembers !== null ? ` / ${maxStaffMembers}` : ""}
                        {" "}
                        {t("adminStaff.rosterSlots")}
                    </span>
                }
                actions={(
                    <Button asChild className="bg-admin-brand text-white hover:bg-admin-brand-hover" disabled={isStaffLimitReached}>
                        <Link href="/admin/dashboard/staff/new">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("adminStaff.inviteStaff")}
                        </Link>
                    </Button>
                )}
            />

            <AdminMetricGrid className="xl:grid-cols-3">
                <StatCard label={t("adminStaff.totalMembers")} value={staff.length} hint={t("adminStaff.totalMembersHint")} icon={<UserRound className="h-5 w-5" />} />
                <StatCard label={t("adminStaff.bookableMembers")} value={bookableCount} hint={t("adminStaff.bookableMembersHint")} icon={<CalendarClock className="h-5 w-5" />} />
                <StatCard label={t("adminStaff.needsAttention")} value={pendingCount + inactiveCount} hint={t("adminStaff.needsAttentionHint", { pending: pendingCount, inactive: inactiveCount })} icon={<CheckCircle2 className="h-5 w-5" />} />
            </AdminMetricGrid>

            {isStaffLimitReached ? (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.staffLimitReached")}
                />
            ) : null}
            {!canManageRoles && canAssignServices ? (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnBusiness")}
                    feature="ROLES_PERMISSIONS"
                />
            ) : null}

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
                            <Button asChild className="bg-admin-brand text-white hover:bg-admin-brand-hover">
                                <Link href="/admin/dashboard/staff/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("adminStaff.inviteStaff")}
                                </Link>
                            </Button>
                        ) : null}
                    />
                )}
                renderMobileItem={(member) => (
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <StaffIdentity member={member} />
                            <StaffAvailabilityStatus
                                member={member}
                                getAvailabilityLabel={getAvailabilityLabel}
                                getStatusLabel={getStatusLabel}
                                getStatusTone={getStatusTone}
                            />
                        </div>
                        <div className="grid gap-3 rounded-lg border border-admin-border bg-admin-surface-subtle p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">{t("adminStaff.resourceType")}</span>
                                <span className="font-medium text-slate-800">{getResourceTypeLabel(member.resource_type)}</span>
                            </div>
                            {canAssignServices ? (
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-500">{t("adminStaff.assignedServices")}</span>
                                    <span className="max-w-[60%] truncate text-right font-medium text-slate-800">{getServiceCoverage(member)}</span>
                                </div>
                            ) : null}
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
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/admin/dashboard/staff/${member.id}`}>{t("adminStaff.viewDetails")}</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/admin/dashboard/staff/${member.id}/edit`}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    {t("meProfile.edit")}
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
                columns={[
                    {
                        key: "member",
                        header: t("adminStaff.member"),
                        cell: (member) => (
                            <Link href={`/admin/dashboard/staff/${member.id}`} className="block hover:text-admin-brand">
                                <StaffIdentity member={member} />
                            </Link>
                        ),
                        className: "min-w-0 max-w-[240px]",
                    },
                    {
                        key: "type",
                        header: t("adminStaff.resourceType"),
                        cell: (member) => <StatusBadge tone="neutral">{getResourceTypeLabel(member.resource_type)}</StatusBadge>,
                    },
                    {
                        key: "status",
                        header: t("adminStaff.availability"),
                        cell: (member) => (
                            <StaffAvailabilityStatus
                                member={member}
                                getAvailabilityLabel={getAvailabilityLabel}
                                getStatusLabel={getStatusLabel}
                                getStatusTone={getStatusTone}
                            />
                        ),
                    },
                    ...(canAssignServices
                        ? [{
                            key: "services",
                            header: t("adminStaff.assignedServices"),
                            cell: (member: StaffMember) => (
                                <div className="max-w-xs">
                                    <p className="truncate text-sm font-medium text-slate-800">{getServiceCoverage(member)}</p>
                                    <p className="text-xs text-slate-500">{t("adminStaff.servicesCount", { count: member.services?.length || 0 })}</p>
                                </div>
                            ),
                        }]
                        : []),
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
                        className: "text-right",
                        cell: (member) => (
                            <div className="flex items-center justify-end gap-2">
                                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                                    <Link href={`/admin/dashboard/staff/${member.id}/edit`}>
                                        <Pencil className="h-3.5 w-3.5" />
                                        {t("meProfile.edit")}
                                    </Link>
                                </Button>
                                <ActionMenu
                                    label={t("adminStaff.memberActions")}
                                    items={[
                                        {
                                            label: t("adminStaff.viewDetails"),
                                            href: `/admin/dashboard/staff/${member.id}`,
                                        },
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
                                            onSelect: () => setDeletingStaff(member),
                                        },
                                    ]}
                                />
                            </div>
                        ),
                    },
                ]}
            />

            <ConfirmDialog
                open={Boolean(deletingStaff)}
                onOpenChange={(open) => {
                    if (!open) setDeletingStaff(null);
                }}
                title={t("adminStaff.removeStaff")}
                description={t("adminStaff.deleteConfirm")}
                confirmLabel={submittingDelete ? t("superAdminShops.removing") : t("adminStaff.removeStaff")}
                cancelLabel={t("common.cancel")}
                variant="destructive"
                loading={submittingDelete}
                onConfirm={handleDelete}
            />
        </AdminPageShell>
    );
}

export function StaffEditorSurface({ staffId }: { staffId?: number }) {
    const router = useRouter();
    const { companyId, companyUser, role: currentRole, user } = useAdminAuth();
    const { t } = useI18n();
    const isEditing = Number.isInteger(staffId);
    const capabilities = companyUser?.company?.capabilities;
    const maxStaffMembers = getStaffLimitForPlan(companyUser?.company);
    const hasStaffModule =
        Boolean(user?.is_super_admin) ||
        companyHasActiveCoreProduct(capabilities);
    const hasBookingModule =
        Boolean(user?.is_super_admin) ||
        companyHasBookingModule(capabilities);
    const canManageRoles =
        Boolean(user?.is_super_admin) ||
        (hasStaffModule && canUseEntitledFeature(companyUser?.company, "ROLES_PERMISSIONS"));

    const [services, setServices] = useState<ServiceItem[]>([]);
    const [canAssignServices, setCanAssignServices] = useState(hasBookingModule);
    const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
    const [loading, setLoading] = useState(Boolean(isEditing));
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<StaffFormData>(initialFormData);
    const [formError, setFormError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [staffCount, setStaffCount] = useState<number | null>(null);

    const isStaffLimitReached = !isEditing && maxStaffMembers !== null && staffCount !== null && staffCount >= maxStaffMembers;

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setLoading(Boolean(isEditing));
            try {
                const requests: Array<Promise<unknown>> = [getStaff(), loadOptionalStaffServices(hasBookingModule)];
                if (isEditing && staffId) {
                    requests.push(getStaffById(staffId));
                }
                const results = await Promise.all(requests);
                const staffRows = results[0] as StaffMember[];
                const serviceResult = results[1] as Awaited<ReturnType<typeof loadOptionalStaffServices>>;
                const selectedMember = isEditing ? (results[2] as StaffMember) : null;

                if (!isMounted) return;
                setServices(serviceResult.services);
                setCanAssignServices(serviceResult.canAssignServices);
                setStaffCount(staffRows.length);

                if (selectedMember) {
                    setStaffMember(selectedMember);
                    setFormData(buildEditableFormData(selectedMember));
                    setPreviewImage(selectedMember.image_url || null);
                } else {
                    setFormData(initialFormData);
                    setPreviewImage(null);
                    setStaffMember(null);
                }
            } catch (error: unknown) {
                if (!isMounted) return;
                setFormError(error instanceof Error ? error.message : t("adminStaff.loadDataError"));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            isMounted = false;
        };
    }, [hasBookingModule, isEditing, staffId, t]);

    const servicesByCategory = useMemo(() => {
        const grouped = new Map<string, { key: string; name: string; services: ServiceItem[] }>();

        for (const service of services) {
            const categoryName = service.category?.name || t("adminServices.uncategorized");
            const categoryKey = service.category?.id ? `category-${service.category.id}` : "category-uncategorized";

            if (!grouped.has(categoryKey)) {
                grouped.set(categoryKey, { key: categoryKey, name: categoryName, services: [] });
            }

            grouped.get(categoryKey)?.services.push(service);
        }

        return Array.from(grouped.values()).sort((left, right) => left.name.localeCompare(right.name));
    }, [services, t]);

    const toggleService = (serviceId: number) => {
        setFormData((current) => ({
            ...current,
            service_ids: current.service_ids.includes(serviceId)
                ? current.service_ids.filter((id) => id !== serviceId)
                : [...current.service_ids, serviceId],
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!companyId) return;
        if (!formData.display_name.trim()) {
            setFormError(t("adminStaff.displayNameRequired"));
            return;
        }
        if (!isEditing && !formData.email.trim()) {
            setFormError(t("adminStaff.emailRequiredInvite"));
            return;
        }
        if (!isEditing && canManageRoles && !["OWNER", "ADMIN", "STAFF"].includes(formData.role)) {
            setFormError(t("superAdminShops.roleRequiredLabel"));
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            const basePayload: SaveStaffPayload = {
                display_name: formData.display_name.trim(),
                bio: formData.bio.trim(),
                is_bookable: formData.is_bookable,
                resource_type: formData.resource_type,
                company_id: companyId,
            };

            let saved: StaffMember;
            if (isEditing && staffId) {
                saved = await updateStaffMember(staffId, basePayload);
                if (canAssignServices) {
                    await updateStaffMemberServices(staffId, formData.service_ids);
                }
            } else {
                saved = await createStaffMember({
                    ...basePayload,
                    email: formData.email.trim(),
                    role: canManageRoles ? formData.role : "STAFF",
                    phone_prefix: formData.phone_prefix.trim() || undefined,
                    phone: formData.phone.trim() || undefined,
                    service_ids: canAssignServices ? formData.service_ids : [],
                    ...(formData.start_date ? { start_date: formData.start_date } : {}),
                    ...(formData.end_date ? { end_date: formData.end_date } : {}),
                });
            }

            if (selectedImage) {
                const uploadedUrl = await uploadAdminImage({
                    file: selectedImage,
                    companyId,
                    type: "staff",
                    entityId: saved.id,
                });
                if (isEditing && staffId) {
                    await updateStaffMember(staffId, { image_url: uploadedUrl });
                }
            }

            router.push(`/admin/dashboard/staff/${saved.id}`);
            router.refresh();
        } catch (error: unknown) {
            setFormError(error instanceof Error ? error.message : t("adminStaff.saveStaffError"));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={6} />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={isEditing ? t("adminStaff.editStaff", { name: staffMember?.display_name || "" }) : t("adminStaff.addNewStaff")}
                subtitle={isEditing
                    ? t("adminStaff.editorEditSubtitle")
                    : t("adminStaff.editorCreateSubtitle")}
                actions={(
                    <Button asChild variant="outline">
                        <Link href={isEditing && staffId ? `/admin/dashboard/staff/${staffId}` : "/admin/dashboard/staff"}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("adminStaff.backToRoster")}
                        </Link>
                    </Button>
                )}
            />

            {isStaffLimitReached ? (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.staffLimitReached")}
                />
            ) : null}
            {!canManageRoles && canAssignServices ? (
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnBusiness")}
                    feature="ROLES_PERMISSIONS"
                />
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                {formError ? (
                    <ErrorState title={t("adminStaff.saveStaffError")} description={formError} className="min-h-0 py-6" />
                ) : null}

                {!isEditing ? (
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle>{t("adminStaff.inviteStaff")}</CardTitle>
                            <CardDescription>{t("adminStaff.inviteStaffByEmail")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="email">{t("adminStaff.email")} *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                                    placeholder={t("adminStaff.emailPlaceholder")}
                                />
                                <p className="text-xs text-slate-500">{t("adminStaff.inviteHint")}</p>
                            </div>

                            {canManageRoles ? (
                                <div className="space-y-2">
                                    <Label htmlFor="role">{t("superAdminShops.roleRequiredLabel")}</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value: "OWNER" | "ADMIN" | "STAFF") => setFormData((current) => ({ ...current, role: value }))}
                                    >
                                        <SelectTrigger id="role">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentRole === "OWNER" ? <SelectItem value="OWNER">{t("superAdminShops.roleOwner")}</SelectItem> : null}
                                            <SelectItem value="ADMIN">{t("superAdminShops.roleAdmin")}</SelectItem>
                                            <SelectItem value="STAFF">{t("superAdminShops.roleStaff")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

                            <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
                                <div className="space-y-2">
                                    <Label htmlFor="phone_prefix">{t("superAdminShops.countryCode")}</Label>
                                    <Input
                                        id="phone_prefix"
                                        value={formData.phone_prefix}
                                        onChange={(event) => setFormData((current) => ({ ...current, phone_prefix: event.target.value }))}
                                        placeholder="591"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="phone">{t("adminCustomers.phone")}</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                                        placeholder="70000000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="start_date">{t("adminStaff.startDate")}</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(event) => setFormData((current) => ({ ...current, start_date: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">{t("adminStaff.endDate")}</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(event) => setFormData((current) => ({ ...current, end_date: event.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle>{t("adminStaff.contactTitle")}</CardTitle>
                            <CardDescription>{t("adminStaff.contactDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStaff.email")}</p>
                                <p className="mt-1 text-sm text-slate-800">{staffMember?.user?.email || t("adminStaff.noEmail")}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminBookings.status")}</p>
                                <p className="mt-1 text-sm text-slate-800">{staffMember?.status || "ACTIVE"}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="admin-card">
                    <CardHeader>
                        <CardTitle>{t("adminStaff.name")}</CardTitle>
                        <CardDescription>{t("adminStaff.identityDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="display_name">{t("adminStaff.name")} *</Label>
                            <Input
                                id="display_name"
                                value={formData.display_name}
                                onChange={(event) => setFormData((current) => ({ ...current, display_name: event.target.value }))}
                                placeholder={t("adminStaff.namePlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="resource_type">{t("adminStaff.resourceType")}</Label>
                            <Select
                                value={formData.resource_type}
                                onValueChange={(value: "PERSON" | "ROOM" | "EQUIPMENT") => setFormData((current) => ({ ...current, resource_type: value }))}
                            >
                                <SelectTrigger id="resource_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERSON">{t("adminStaff.resourceTypePerson")}</SelectItem>
                                    <SelectItem value="ROOM">{t("adminStaff.resourceTypeRoom")}</SelectItem>
                                    <SelectItem value="EQUIPMENT">{t("adminStaff.resourceTypeEquipment")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-admin-border px-3 py-2">
                            <div>
                                <Label htmlFor="is_bookable">{t("adminStaff.bookable")}</Label>
                                <p className="text-xs text-slate-500">{t("adminStaff.bookableHint")}</p>
                            </div>
                            <Switch
                                id="is_bookable"
                                checked={formData.is_bookable}
                                onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_bookable: checked }))}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="bio">{t("adminStaff.bio")}</Label>
                            <textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(event) => setFormData((current) => ({ ...current, bio: event.target.value }))}
                                placeholder={t("adminStaff.bioPlaceholder")}
                                className="admin-textarea h-28 resize-none"
                            />
                        </div>
                    </CardContent>
                </Card>

                {canAssignServices ? (
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle>{t("adminStaff.assignedServices")}</CardTitle>
                            <CardDescription>{t("adminStaff.assignedServicesDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {services.length === 0 ? (
                                <p className="text-sm italic text-slate-500">{t("adminStaff.noServicesHint")}</p>
                            ) : (
                                <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border border-admin-border p-3">
                                    {servicesByCategory.map((group) => (
                                        <div key={group.key} className="space-y-1">
                                            <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.name}</p>
                                            {group.services.length === 0 ? (
                                                <p className="px-2 pb-2 text-xs text-slate-400">{t("adminStaff.emptyCategoryServices")}</p>
                                            ) : (
                                                group.services.map((service) => (
                                                    <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-admin-surface-subtle">
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
                        </CardContent>
                    </Card>
                ) : null}

                <Card className="admin-card">
                    <CardHeader>
                        <CardTitle>{t("adminStaff.photo")}</CardTitle>
                        <CardDescription>{t("adminStaff.photoDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs">
                            <ImageUpload
                                companyId={companyId || 0}
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
                    </CardContent>
                </Card>

                <StickyFormActions
                    type="submit"
                    loading={submitting}
                    saveLabel={isEditing ? t("adminStaff.updateStaff") : t("adminStaff.addStaff")}
                    loadingLabel={t("adminServices.saving")}
                    cancelLabel={t("common.cancel")}
                    onCancel={() => router.push(isEditing && staffId ? `/admin/dashboard/staff/${staffId}` : "/admin/dashboard/staff")}
                    saveIcon={<Save className="h-4 w-4" />}
                />
            </form>
        </AdminPageShell>
    );
}

export function StaffProfileSurface({ staffId }: { staffId: number }) {
    const { companyUser, user } = useAdminAuth();
    const { t, locale } = useI18n();
    const capabilities = companyUser?.company?.capabilities;
    const hasBookingModule =
        Boolean(user?.is_super_admin) ||
        companyHasBookingModule(capabilities);
    const [member, setMember] = useState<StaffMember | null>(null);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [canAssignServices, setCanAssignServices] = useState(hasBookingModule);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [staffMember, serviceResult] = await Promise.all([
                    getStaffById(staffId),
                    loadOptionalStaffServices(hasBookingModule),
                ]);
                if (!isMounted) return;
                setMember(staffMember);
                setServices(serviceResult.services);
                setCanAssignServices(serviceResult.canAssignServices);
            } catch (fetchError: unknown) {
                if (!isMounted) return;
                setError(fetchError instanceof Error ? fetchError.message : t("adminStaff.loadDataError"));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            isMounted = false;
        };
    }, [hasBookingModule, staffId, t]);

    const { getAvailabilityLabel, getResourceTypeLabel, getServiceCoverage, getStatusLabel, getStatusTone, servicesById } = useStaffHelpers(services);

    if (loading) {
        return (
            <AdminPageShell>
                <LoadingSkeleton rows={5} />
            </AdminPageShell>
        );
    }

    if (error || !member) {
        return (
            <AdminPageShell>
                <AdminPageHeader
                    title={t("adminStaff.profileTitle")}
                    subtitle={t("adminStaff.profileLoadFailedSubtitle")}
                    actions={(
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/staff">{t("adminStaff.backToRoster")}</Link>
                        </Button>
                    )}
                />
                <ErrorState
                    icon={UserRound}
                    title={t("adminStaff.staffNotFound")}
                    description={error || t("adminStaff.staffNotFoundDescription")}
                />
            </AdminPageShell>
        );
    }

    const assignedServices = (member.services || []).map((serviceId) => servicesById.get(serviceId)).filter(Boolean) as ServiceItem[];
    const status = getStaffRosterStatus(member);

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={member.display_name}
                subtitle={t("adminStaff.profileSubtitle")}
                meta={member.user?.email || t("adminStaff.noEmail")}
                actions={(
                    <>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard/staff">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t("adminStaff.backToRoster")}
                            </Link>
                        </Button>
                        <Button asChild className="bg-admin-brand text-white hover:bg-admin-brand-hover">
                            <Link href={`/admin/dashboard/staff/${member.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("meProfile.edit")}
                            </Link>
                        </Button>
                    </>
                )}
            />

            <AdminMetricGrid>
                <StatCard label={t("adminStaff.resourceType")} value={getResourceTypeLabel(member.resource_type)} hint={t("adminStaff.bookable")} icon={<UserRound className="h-5 w-5" />} />
                <StatCard label={t("adminStaff.availability")} value={getStatusLabel(status)} hint={getAvailabilityLabel(member)} icon={<CalendarClock className="h-5 w-5" />} />
                {canAssignServices ? (
                    <StatCard label={t("adminStaff.assignedServices")} value={member.services?.length || 0} hint={getServiceCoverage(member)} icon={<CheckCircle2 className="h-5 w-5" />} />
                ) : null}
                <StatCard label={t("adminStaff.bookable")} value={member.is_bookable ? t("superAdminShops.yes") : t("superAdminShops.no")} hint={t("adminStaff.bookableToggleHint")} icon={<CheckCircle2 className="h-5 w-5" />} />
            </AdminMetricGrid>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card className="admin-card">
                    <CardHeader>
                        <CardTitle>{t("adminStaff.profileSectionTitle")}</CardTitle>
                        <CardDescription>{t("adminStaff.profileSectionDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            {member.image_url ? (
                                <img src={getImageUrl(member.image_url) || ""} alt={member.display_name} className="h-20 w-20 rounded-xl object-cover" />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-admin-brand-soft text-lg font-semibold text-admin-brand-soft-text">
                                    {getInitials(member.display_name)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-lg font-semibold text-slate-950">{member.display_name}</p>
                                <p className="text-sm text-slate-500">{member.user?.email || t("adminStaff.noEmail")}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <StatusBadge tone={getStatusTone(status)} dot>{getStatusLabel(status)}</StatusBadge>
                                    <StatusBadge tone="neutral">{getResourceTypeLabel(member.resource_type)}</StatusBadge>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStaff.bookable")}</p>
                                <p className="mt-1 text-sm text-slate-800">{member.is_bookable ? t("superAdminShops.yes") : t("superAdminShops.no")}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStaff.availabilityWindow")}</p>
                                <p className="mt-1 text-sm text-slate-800">{getAvailabilityLabel(member)}</p>
                            </div>
                            {member.start_date ? (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStaff.startDate")}</p>
                                    <p className="mt-1 text-sm text-slate-800">{formatShortDate(member.start_date, locale)}</p>
                                </div>
                            ) : null}
                            {member.end_date ? (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStaff.endDate")}</p>
                                    <p className="mt-1 text-sm text-slate-800">{formatShortDate(member.end_date, locale)}</p>
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("adminStaff.bio")}</p>
                            <p className="mt-1 text-sm text-slate-800">{member.bio || t("adminStaff.bioPlaceholder")}</p>
                        </div>
                    </CardContent>
                </Card>

                {canAssignServices ? (
                    <Card className="admin-card">
                        <CardHeader>
                            <CardTitle>{t("adminStaff.assignedServices")}</CardTitle>
                            <CardDescription>{t("adminStaff.profileServicesDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {assignedServices.length === 0 ? (
                                <EmptyState icon={CheckCircle2} title={t("adminStaff.noServicesAssigned")} description={t("adminStaff.noServicesHint")} />
                            ) : (
                                <div className="space-y-3">
                                    {assignedServices.map((service) => (
                                        <div key={service.id} className="rounded-lg border border-admin-border p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{service.name}</p>
                                                    <p className="text-xs text-slate-500">{service.category?.name || t("adminServices.uncategorized")}</p>
                                                </div>
                                                <StatusBadge tone="neutral">{service.duration_minutes} min</StatusBadge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </AdminPageShell>
    );
}
