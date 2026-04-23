"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    createGroupClass,
    getAdminCompanyLocation,
    getStaff,
    setGroupClassStatus,
    updateGroupClass,
    uploadAdminImage,
    type AdminCompanyLocation,
    type CreateGroupClassPayload,
    type GroupStaffRole,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { GroupClassEditorForm } from "@/app/admin/dashboard/group-reservations/classes/components/GroupClassEditorForm";
import {
    type ClassFormState,
    defaultClassForm,
    getCompanyLocationLabel,
} from "@/app/admin/dashboard/group-reservations/classes/components/groupClassForm.shared";
import { useGroupReservationsAccess } from "@/app/admin/dashboard/group-reservations/lib/useGroupReservationsAccess";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { Button } from "@/components/ui/button";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { parseCurrencyInputToCents } from "@/lib/currency";

export default function NewGroupClassPage() {
    const t = useT();
    const router = useRouter();
    const { companyId, companyUser } = useAdminAuth();
    const currency = companyUser?.company?.currency;
    const { canUseClasses } = useGroupReservationsAccess();

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [storeLocation, setStoreLocation] = useState<AdminCompanyLocation | null>(null);
    const [storeLocationText, setStoreLocationText] = useState("");
    const [form, setForm] = useState<ClassFormState>(defaultClassForm);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);

    const loadEditorData = useCallback(async () => {
        setLoading(true);
        try {
            const [staffData, companyLocation] = await Promise.all([
                getStaff(),
                companyId ? getAdminCompanyLocation(companyId) : Promise.resolve(null),
            ]);
            const defaultLocationText = getCompanyLocationLabel(companyLocation);
            setStaff(staffData);
            setStoreLocation(companyLocation);
            setStoreLocationText(defaultLocationText);
            setForm(defaultClassForm(defaultLocationText));
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (!canUseClasses) return;
        void loadEditorData();
    }, [canUseClasses, loadEditorData]);

    const handleSelectCoverImage = (file: File | null) => {
        setCoverImageFile(file);
        if (!file) {
            setCoverImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => setCoverImagePreview(typeof event.target?.result === "string" ? event.target.result : null);
        reader.readAsDataURL(file);
    };

    const handleSelectThumbnailImage = (file: File | null) => {
        setThumbnailImageFile(file);
        if (!file) {
            setThumbnailImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => setThumbnailImagePreview(typeof event.target?.result === "string" ? event.target.result : null);
        reader.readAsDataURL(file);
    };

    const handleCreate = async () => {
        if (!form.title.trim()) {
            await notify.warning(t("adminGroup.forms.titleRequired"));
            return;
        }

        const maxCapacity = Number.parseInt(form.max_capacity_per_session, 10);
        const duration = Number.parseInt(form.session_duration_minutes, 10);
        const priceCents = parseCurrencyInputToCents(form.price_cents);

        if (!Number.isFinite(maxCapacity) || maxCapacity < 1) {
            await notify.warning(t("adminGroup.forms.invalidCapacity"));
            return;
        }
        if (!Number.isFinite(duration) || duration < 5) {
            await notify.warning(t("adminGroup.forms.invalidDuration"));
            return;
        }
        if (priceCents === null) {
            await notify.warning(t("adminGroup.forms.invalidPrice"));
            return;
        }

        let recurrenceConfig: Record<string, unknown> = {};
        if (form.recurrence_type === "MONTHLY") {
            const monthdays = form.monthdays
                .split(",")
                .map((part) => Number.parseInt(part.trim(), 10))
                .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31);
            recurrenceConfig = { monthdays };
            if (monthdays.length === 0) {
                await notify.warning(t("adminGroup.forms.invalidMonthdays"));
                return;
            }
        } else {
            const weekdays = [...new Set(form.weekdays)].sort((a, b) => a - b);
            recurrenceConfig = { weekdays };
            if (weekdays.length === 0) {
                await notify.warning(t("adminGroup.forms.invalidWeekdays"));
                return;
            }
        }

        setCreating(true);
        try {
            const payload: CreateGroupClassPayload = {
                title: form.title.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                cover_image_url: form.cover_image_url.trim() || null,
                thumbnail_url: form.thumbnail_url.trim() || null,
                pricing_mode: form.pricing_mode,
                price_cents: priceCents,
                max_capacity_per_session: maxCapacity,
                capacity_visible: form.capacity_visible,
                session_duration_minutes: duration,
                recurrence_type: form.recurrence_type,
                recurrence_config: recurrenceConfig,
                recurrence_start_date: form.recurrence_start_date,
                recurrence_end_date: form.recurrence_end_date.trim() || null,
                start_time: form.start_time,
                location_text: form.location_text.trim() || null,
                staff_assignments: [
                    ...form.linked_staff_ids.map((id) => ({
                        staff_profile_id: id,
                        role: "INSTRUCTOR" as GroupStaffRole,
                    })),
                    ...form.manual_staff
                        .filter((entry) => entry.display_name.trim().length > 0)
                        .map((entry) => ({
                            display_name: entry.display_name.trim(),
                            display_phone: entry.display_phone.trim() || null,
                            role: entry.role,
                        })),
                ],
            };

            const created = await createGroupClass(payload);

            if (companyId && (coverImageFile || thumbnailImageFile)) {
                const imagePatch: { cover_image_url?: string | null; thumbnail_url?: string | null } = {};
                const uploadErrors: string[] = [];

                if (coverImageFile) {
                    try {
                        imagePatch.cover_image_url = await uploadAdminImage({
                            file: coverImageFile,
                            companyId,
                            type: "group_class_cover",
                            entityId: created.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload cover image");
                    }
                }

                if (thumbnailImageFile) {
                    try {
                        imagePatch.thumbnail_url = await uploadAdminImage({
                            file: thumbnailImageFile,
                            companyId,
                            type: "group_class_thumbnail",
                            entityId: created.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload thumbnail image");
                    }
                }

                if (Object.keys(imagePatch).length > 0) {
                    await updateGroupClass(created.id, imagePatch);
                }

                if (uploadErrors.length > 0) {
                    await notify.warning(uploadErrors.join(" | "));
                }
            }

            if (form.status !== "DRAFT") {
                await setGroupClassStatus(created.id, form.status);
            }

            await notify.success(t("adminGroup.classes.created"));
            router.push(`/admin/dashboard/group-reservations/classes/${created.id}`);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.classes.createError"));
        } finally {
            setCreating(false);
        }
    };

    if (!canUseClasses) {
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={t("planEnforcement.availableOnPro")}
                feature="GROUP_CLASSES"
                requiredPlan="PRO"
                fullPage
            />
        );
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AdminPageHeader
                title={t("adminGroup.classes.newClass")}
                subtitle={t("adminGroup.classes.createDescription")}
                actions={
                    <Button asChild variant="outline">
                        <Link href="/admin/dashboard/group-reservations/classes">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("common.cancel")}
                        </Link>
                    </Button>
                }
            />

            <GroupClassEditorForm
                form={form}
                onFormChange={(updater) => setForm(updater)}
                staff={staff}
                currency={currency}
                storeLocation={storeLocation}
                storeLocationText={storeLocationText}
                coverImagePreview={coverImagePreview}
                thumbnailImagePreview={thumbnailImagePreview}
                onSelectCoverImage={handleSelectCoverImage}
                onSelectThumbnailImage={handleSelectThumbnailImage}
                sectionTitle={t("adminGroup.classes.newClass")}
            />

            <StickyFormActions
                onSave={handleCreate}
                loading={creating}
                saveLabel={t("adminGroup.actions.create")}
                loadingLabel={t("adminServices.saving")}
                saveIcon={<Save className="h-4 w-4" />}
                saveClassName="bg-admin-brand text-white hover:bg-admin-brand-hover"
                onCancel={() => router.push("/admin/dashboard/group-reservations/classes")}
                cancelLabel={t("common.cancel")}
            />
        </div>
    );
}
