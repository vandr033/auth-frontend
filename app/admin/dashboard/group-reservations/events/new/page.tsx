"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    createGroupEvent,
    getAdminCompanyLocation,
    getGroupBookingFlowSettings,
    getStaff,
    setGroupEventStatus,
    updateGroupEvent,
    uploadAdminImage,
    type AdminCompanyLocation,
    type CreateGroupEventPayload,
    type GroupBookingFlowSettings,
    type GroupItemStatus,
    type GroupStaffRole,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { useGroupReservationsAccess } from "@/app/admin/dashboard/group-reservations/lib/useGroupReservationsAccess";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { GroupLocationPicker } from "@/components/maps/GroupLocationPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { parseCurrencyInputToCents } from "@/lib/currency";

type ManualStaff = {
    display_name: string;
    display_phone: string;
    role: GroupStaffRole;
};

type EventFormState = {
    title: string;
    slug: string;
    description: string;
    registration_question_text: string;
    registration_question_required: boolean;
    no_availability_message: string;
    cover_image_url: string;
    thumbnail_url: string;
    is_free: boolean;
    price_cents: string;
    max_capacity: string;
    capacity_visible: boolean;
    start_at: string;
    end_at: string;
    location_text: string;
    status: GroupItemStatus;
    linked_staff_ids: number[];
    manual_staff: ManualStaff[];
};

const GROUP_MEDIA_RECOMMENDED_SIZE = "1920px x 1080px";
const EMPTY_MANUAL_STAFF: ManualStaff = {
    display_name: "",
    display_phone: "",
    role: "INSTRUCTOR",
};

function normalizeSlugInput(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .slice(0, 255);
}

function slugifyInput(value: string): string {
    return normalizeSlugInput(value).replace(/-+$/g, "");
}

function toLocalInputValue(date: Date): string {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 16);
}

function getCompanyLocationLabel(companyLocation: AdminCompanyLocation | null): string {
    if (!companyLocation) return "";
    return [companyLocation.address, companyLocation.city, companyLocation.state]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)
        .join(", ");
}

function createDefaultForm(defaultLocationText = ""): EventFormState {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
        title: "",
        slug: "",
        description: "",
        registration_question_text: "",
        registration_question_required: false,
        no_availability_message: "",
        cover_image_url: "",
        thumbnail_url: "",
        is_free: true,
        price_cents: "0",
        max_capacity: "20",
        capacity_visible: false,
        start_at: toLocalInputValue(start),
        end_at: toLocalInputValue(end),
        location_text: defaultLocationText,
        status: "DRAFT",
        linked_staff_ids: [],
        manual_staff: [],
    };
}

export default function NewGroupEventPage() {
    const t = useT();
    const router = useRouter();
    const { companyId, companyUser } = useAdminAuth();
    const { canUseAdvanced, canUseEvents, getRequiredPlan } = useGroupReservationsAccess();
    const currency = companyUser?.company?.currency;

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [settings, setSettings] = useState<GroupBookingFlowSettings | null>(null);
    const [storeLocation, setStoreLocation] = useState<AdminCompanyLocation | null>(null);
    const [storeLocationText, setStoreLocationText] = useState("");
    const [form, setForm] = useState<EventFormState>(createDefaultForm);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [staffData, settingsData, companyLocation] = await Promise.all([
                getStaff(),
                getGroupBookingFlowSettings(),
                companyId ? getAdminCompanyLocation(companyId) : Promise.resolve(null),
            ]);
            const defaultLocationText = getCompanyLocationLabel(companyLocation);
            setStaff(staffData);
            setSettings(settingsData);
            setStoreLocation(companyLocation);
            setStoreLocationText(defaultLocationText);
            setForm(createDefaultForm(defaultLocationText));
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (!canUseEvents) return;
        void loadData();
    }, [canUseEvents, loadData]);

    const toggleLinkedStaff = (staffId: number) => {
        setForm((prev) => {
            const exists = prev.linked_staff_ids.includes(staffId);
            return {
                ...prev,
                linked_staff_ids: exists
                    ? prev.linked_staff_ids.filter((id) => id !== staffId)
                    : [...prev.linked_staff_ids, staffId],
            };
        });
    };

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

        const startAt = new Date(form.start_at);
        const endAt = new Date(form.end_at);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
            await notify.warning(t("adminGroup.forms.invalidDateRange"));
            return;
        }

        const maxCapacity = Number.parseInt(form.max_capacity, 10);
        if (!Number.isFinite(maxCapacity) || maxCapacity < 1) {
            await notify.warning(t("adminGroup.forms.invalidCapacity"));
            return;
        }

        const priceCents = parseCurrencyInputToCents(form.price_cents);
        if (!form.is_free && priceCents === null) {
            await notify.warning(t("adminGroup.forms.invalidPrice"));
            return;
        }
        if (form.registration_question_required && !form.registration_question_text.trim()) {
            await notify.warning(t("adminGroup.forms.registrationQuestionRequired"));
            return;
        }

        setCreating(true);
        try {
            const manualAssignments = form.manual_staff
                .filter((entry) => entry.display_name.trim().length > 0)
                .map((entry) => ({
                    display_name: entry.display_name.trim(),
                    display_phone: entry.display_phone.trim() || null,
                    role: entry.role,
                }));

            const payload: CreateGroupEventPayload = {
                title: form.title.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                registration_question_text: form.registration_question_text.trim() || null,
                registration_question_required: form.registration_question_required,
                no_availability_message: form.is_free ? (form.no_availability_message.trim() || null) : null,
                cover_image_url: form.cover_image_url.trim() || null,
                thumbnail_url: form.thumbnail_url.trim() || null,
                is_free: form.is_free,
                price_cents: form.is_free ? 0 : (priceCents ?? 0),
                max_capacity: maxCapacity,
                capacity_visible: form.capacity_visible,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                location_text: form.location_text.trim() || null,
                staff_assignments: [
                    ...form.linked_staff_ids.map((staffId) => ({
                        staff_profile_id: staffId,
                        role: "INSTRUCTOR" as GroupStaffRole,
                    })),
                    ...manualAssignments,
                ],
            };

            const created = await createGroupEvent(payload);

            if (companyId && (coverImageFile || thumbnailImageFile)) {
                const imagePatch: { cover_image_url?: string | null; thumbnail_url?: string | null } = {};
                const uploadErrors: string[] = [];

                if (coverImageFile) {
                    try {
                        imagePatch.cover_image_url = await uploadAdminImage({
                            file: coverImageFile,
                            companyId,
                            type: "group_event_cover",
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
                            type: "group_event_thumbnail",
                            entityId: created.id,
                        });
                    } catch (error) {
                        uploadErrors.push(error instanceof Error ? error.message : "Failed to upload thumbnail image");
                    }
                }

                if (Object.keys(imagePatch).length > 0) {
                    await updateGroupEvent(created.id, imagePatch);
                }

                if (uploadErrors.length > 0) {
                    await notify.warning(uploadErrors.join(" | "));
                }
            }

            if (form.status !== "DRAFT") {
                await setGroupEventStatus(created.id, form.status);
            }

            await notify.success(t("adminGroup.events.created"));
            router.push(`/admin/dashboard/group-reservations/events/${created.id}`);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.events.createError"));
        } finally {
            setCreating(false);
        }
    };

    if (!canUseEvents) {
        const requiredPlan = getRequiredPlan("GROUP_EVENTS");
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                feature="GROUP_EVENTS"
                requiredPlan={requiredPlan}
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
                title={t("adminGroup.events.newEvent")}
                subtitle={t("adminGroup.events.createDescription")}
                actions={
                    <Button asChild variant="outline">
                        <Link href="/admin/dashboard/group-reservations/events">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("common.cancel")}
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.fields.title")}</CardTitle>
                            <CardDescription>{t("adminGroup.events.createDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("adminGroup.fields.title")}</Label>
                                <Input
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((prev) => {
                                            const nextTitle = event.target.value;
                                            const prevAutoSlug = slugifyInput(prev.title);
                                            const shouldSyncSlug = prev.slug.trim().length === 0 || prev.slug.trim() === prevAutoSlug;
                                            return {
                                                ...prev,
                                                title: nextTitle,
                                                slug: shouldSyncSlug ? slugifyInput(nextTitle) : prev.slug,
                                            };
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.slug")}</Label>
                                <Input
                                    value={form.slug}
                                    onChange={(event) => setForm((prev) => ({ ...prev, slug: normalizeSlugInput(event.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.status")}</Label>
                                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as GroupItemStatus }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRAFT">{t("adminGroup.status.draft")}</SelectItem>
                                        <SelectItem value="PUBLISHED">{t("adminGroup.status.published")}</SelectItem>
                                        <SelectItem value="ARCHIVED">{t("adminGroup.status.archived")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("adminGroup.fields.description")}</Label>
                                <RichTextEditor
                                    value={form.description}
                                    onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
                                    placeholder="<p><strong>Descripcion en HTML</strong></p>"
                                    minHeightClassName="min-h-[160px]"
                                />
                            </div>
                            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                                <div>
                                    <Label>{t("adminGroup.fields.registrationQuestion")}</Label>
                                    <p className="mt-1 text-xs text-slate-500">{t("adminGroup.fields.registrationQuestionHelp")}</p>
                                </div>
                                <textarea
                                    className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    value={form.registration_question_text}
                                    onChange={(event) => setForm((prev) => ({ ...prev, registration_question_text: event.target.value }))}
                                    placeholder={t("adminGroup.fields.registrationQuestionPlaceholder")}
                                    maxLength={500}
                                />
                                <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                                    <span>{t("adminGroup.fields.registrationQuestionRequired")}</span>
                                    <Switch
                                        checked={form.registration_question_required}
                                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, registration_question_required: checked }))}
                                    />
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.fields.startAt")} / {t("adminGroup.fields.endAt")}</CardTitle>
                            <CardDescription>{t("adminGroup.fields.location")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.startAt")}</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.start_at}
                                    onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.endAt")}</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.end_at}
                                    onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <GroupLocationPicker
                                    label={t("adminGroup.fields.location")}
                                    value={form.location_text}
                                    onChange={(nextValue) => setForm((prev) => ({ ...prev, location_text: nextValue }))}
                                    placeholder={storeLocationText || undefined}
                                    defaultLatitude={storeLocation?.latitude ?? null}
                                    defaultLongitude={storeLocation?.longitude ?? null}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.fields.price")} / {t("adminGroup.fields.capacity")}</CardTitle>
                            <CardDescription>{t("adminGroup.fields.eventType")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.eventType")}</Label>
                                <Select
                                    value={form.is_free ? "FREE" : "PAID"}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, is_free: value === "FREE" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FREE">{t("adminGroup.events.free")}</SelectItem>
                                        <SelectItem value="PAID">{t("adminGroup.events.paid")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {!form.is_free ? (
                                <div className="space-y-2">
                                    <Label>{t("adminGroup.fields.priceCents", { currency: currency || "Bs." })}</Label>
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={form.price_cents}
                                        onChange={(event) => setForm((prev) => ({ ...prev, price_cents: event.target.value }))}
                                    />
                                </div>
                            ) : null}
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.capacity")}</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.max_capacity}
                                    onChange={(event) => setForm((prev) => ({ ...prev, max_capacity: event.target.value }))}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                                <Label className="text-sm">Cupos visibles</Label>
                                <Switch
                                    checked={form.capacity_visible}
                                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, capacity_visible: checked }))}
                                />
                            </div>
                            {form.is_free ? (
                                <div className="space-y-2 md:col-span-2">
                                    <Label>{t("adminGroup.fields.noAvailabilityMessage")}</Label>
                                    <textarea
                                        className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                        value={form.no_availability_message}
                                        onChange={(event) => setForm((prev) => ({ ...prev, no_availability_message: event.target.value }))}
                                        placeholder={t("adminGroup.fields.noAvailabilityMessagePlaceholder")}
                                    />
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.staff.linkedStaff")}</CardTitle>
                            <CardDescription>{t("adminGroup.staff.manualDisplay")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2 md:grid-cols-2">
                                {staff
                                    .filter((member) => member.is_bookable)
                                    .map((member) => (
                                        <label key={member.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={form.linked_staff_ids.includes(member.id)}
                                                onChange={() => toggleLinkedStaff(member.id)}
                                            />
                                            <span>{member.display_name}</span>
                                        </label>
                                    ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-900">{t("adminGroup.staff.manualDisplay")}</h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setForm((prev) => ({ ...prev, manual_staff: [...prev.manual_staff, { ...EMPTY_MANUAL_STAFF }] }))}
                                    >
                                        {t("adminGroup.actions.add")}
                                    </Button>
                                </div>
                                {form.manual_staff.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t("adminGroup.staff.manualEmpty")}</p>
                                ) : (
                                    form.manual_staff.map((entry, index) => (
                                        <div key={index} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-4">
                                            <Input
                                                placeholder={t("adminGroup.fields.name")}
                                                value={entry.display_name}
                                                onChange={(event) => setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.map((item, itemIndex) =>
                                                        itemIndex === index ? { ...item, display_name: event.target.value } : item,
                                                    ),
                                                }))}
                                            />
                                            <Input
                                                placeholder={t("adminGroup.fields.phone")}
                                                value={entry.display_phone}
                                                onChange={(event) => setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.map((item, itemIndex) =>
                                                        itemIndex === index ? { ...item, display_phone: event.target.value } : item,
                                                    ),
                                                }))}
                                            />
                                            <Select
                                                value={entry.role}
                                                onValueChange={(value) => setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.map((item, itemIndex) =>
                                                        itemIndex === index ? { ...item, role: value as GroupStaffRole } : item,
                                                    ),
                                                }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INSTRUCTOR">{t("adminGroup.staff.instructor")}</SelectItem>
                                                    <SelectItem value="ASSISTANT">{t("adminGroup.staff.assistant")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setForm((prev) => ({
                                                    ...prev,
                                                    manual_staff: prev.manual_staff.filter((_, itemIndex) => itemIndex !== index),
                                                }))}
                                            >
                                                {t("adminGroup.actions.remove")}
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.fields.coverImageUrl")}</CardTitle>
                            <CardDescription>{t("adminGroup.fields.recommendedSize", { size: GROUP_MEDIA_RECOMMENDED_SIZE })}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.coverImageUrl")}</Label>
                                <Input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    onChange={(event) => handleSelectCoverImage(event.target.files?.[0] ?? null)}
                                />
                                {coverImagePreview ? (
                                    <div className="h-44 overflow-hidden rounded-md border border-slate-200">
                                        <img src={coverImagePreview} alt="Cover preview" className="h-full w-full object-cover" />
                                    </div>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminGroup.fields.thumbnailUrl")}</Label>
                                <Input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    onChange={(event) => handleSelectThumbnailImage(event.target.files?.[0] ?? null)}
                                />
                                {thumbnailImagePreview ? (
                                    <div className="h-44 overflow-hidden rounded-md border border-slate-200">
                                        <img src={thumbnailImagePreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.events.bookingFlowNote")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                                <li>
                                    {t("adminGroup.events.autoConfirmState", {
                                        value: settings?.auto_confirm_bookings ? t("adminGroup.values.on") : t("adminGroup.values.off"),
                                    })}
                                </li>
                                <li>
                                    {t("adminGroup.events.paymentMethodsState", {
                                        cash: settings?.allow_cash_payment ? t("adminGroup.values.enabled") : t("adminGroup.values.disabled"),
                                        qr: settings?.allow_qr_payment ? t("adminGroup.values.enabled") : t("adminGroup.values.disabled"),
                                    })}
                                </li>
                                {canUseAdvanced ? <li>{t("adminGroup.events.waitlistEnabled")}</li> : null}
                            </ul>
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <StickyFormActions
                onSave={handleCreate}
                loading={creating}
                saveLabel={t("adminGroup.actions.create")}
                loadingLabel={t("adminServices.saving")}
                saveIcon={<Save className="h-4 w-4" />}
                saveClassName="bg-admin-brand text-white hover:bg-admin-brand-hover"
                onCancel={() => router.push("/admin/dashboard/group-reservations/events")}
                cancelLabel={t("common.cancel")}
            />
        </div>
    );
}
