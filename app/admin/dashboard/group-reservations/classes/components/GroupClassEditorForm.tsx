"use client";
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";

import {
    type AdminCompanyLocation,
    type GroupItemStatus,
    type GroupPricingMode,
    type GroupRecurrenceType,
    type GroupStaffRole,
    type StaffMember,
} from "@/app/admin/lib/adminApi";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { GroupLocationPicker } from "@/components/maps/GroupLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyActionBar } from "@/components/ui/sticky-form-actions";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { getImageUrl } from "@/utils/image-url";
import { AdminSectionCard } from "@/app/admin/dashboard/components/AdminSectionCard";

import {
    EMPTY_MANUAL_STAFF,
    GROUP_MEDIA_RECOMMENDED_SIZE,
    type ClassFormState,
    WEEKDAYS,
    normalizeSlugInput,
    slugifyInput,
} from "./groupClassForm.shared";

type GroupClassEditorFormProps = {
    form: ClassFormState;
    onFormChange: (updater: (prev: ClassFormState) => ClassFormState) => void;
    staff: StaffMember[];
    currency?: string | null;
    storeLocation: AdminCompanyLocation | null;
    storeLocationText: string;
    coverImagePreview: string | null;
    thumbnailImagePreview: string | null;
    onSelectCoverImage: (file: File | null) => void;
    onSelectThumbnailImage: (file: File | null) => void;
    sectionTitle?: ReactNode;
    footer?: ReactNode;
};

type MediaUploadFieldProps = {
    title: string;
    preview: string | null;
    fallbackUrl?: string | null;
    alt: string;
    onSelectFile: (file: File | null) => void;
};

function MediaUploadField({
    title,
    preview,
    fallbackUrl,
    alt,
    onSelectFile,
}: MediaUploadFieldProps) {
    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                <p className="text-xs text-slate-500">{GROUP_MEDIA_RECOMMENDED_SIZE}</p>
            </div>
            <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
            />
            {(preview || fallbackUrl) ? (
                <div className="h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img
                        src={preview || getImageUrl(fallbackUrl) || undefined}
                        alt={alt}
                        className="h-full w-full object-cover"
                    />
                </div>
            ) : null}
        </div>
    );
}

export function GroupClassEditorForm({
    form,
    onFormChange,
    staff,
    currency,
    storeLocation,
    storeLocationText,
    coverImagePreview,
    thumbnailImagePreview,
    onSelectCoverImage,
    onSelectThumbnailImage,
    sectionTitle,
    footer,
}: GroupClassEditorFormProps) {
    const t = useT();

    const toggleWeekday = (weekday: number) => {
        onFormChange((prev) => {
            const exists = prev.weekdays.includes(weekday);
            return {
                ...prev,
                weekdays: exists ? prev.weekdays.filter((day) => day !== weekday) : [...prev.weekdays, weekday],
            };
        });
    };

    const toggleLinkedStaff = (staffId: number) => {
        onFormChange((prev) => {
            const exists = prev.linked_staff_ids.includes(staffId);
            return {
                ...prev,
                linked_staff_ids: exists
                    ? prev.linked_staff_ids.filter((id) => id !== staffId)
                    : [...prev.linked_staff_ids, staffId],
            };
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
                <AdminSectionCard
                    title={sectionTitle ?? t("adminGroup.classes.editClass")}
                    className="min-w-0"
                    contentClassName="space-y-5"
                >
                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                        <div className="space-y-2 lg:col-span-2">
                            <Label>{t("adminGroup.fields.title")}</Label>
                            <Input
                                value={form.title}
                                onChange={(e) =>
                                    onFormChange((prev) => {
                                        const nextTitle = e.target.value;
                                        const prevAutoSlug = slugifyInput(prev.title);
                                        const shouldSyncSlug =
                                            prev.slug.trim().length === 0 || prev.slug.trim() === prevAutoSlug;
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
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        slug: normalizeSlugInput(e.target.value),
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.status")}</Label>
                            <Select
                                value={form.status}
                                onValueChange={(value) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        status: value as GroupItemStatus,
                                    }))
                                }
                            >
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
                        <div className="space-y-2 lg:col-span-2">
                            <Label>{t("adminGroup.fields.description")}</Label>
                            <RichTextEditor
                                value={form.description}
                                onChange={(html) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        description: html,
                                    }))
                                }
                                placeholder="<p><strong>Descripcion en HTML</strong></p>"
                                minHeightClassName="min-h-[160px]"
                            />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.pricingMode")}</Label>
                            <Select
                                value={form.pricing_mode}
                                onValueChange={(value) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        pricing_mode: value as GroupPricingMode,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PER_SESSION">{t("adminGroup.pricing.perSession")}</SelectItem>
                                    <SelectItem value="WEEKLY_PASS">{t("adminGroup.pricing.weeklyPass")}</SelectItem>
                                    <SelectItem value="MONTHLY_PASS">{t("adminGroup.pricing.monthlyPass")}</SelectItem>
                                    <SelectItem value="FULL_COURSE">{t("adminGroup.pricing.fullCourse")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.priceCents", { currency: currency || "Bs." })}</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.price_cents}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        price_cents: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.capacityPerSession")}</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.max_capacity_per_session}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        max_capacity_per_session: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                            <Label className="text-sm">Cupos visibles</Label>
                            <Switch
                                checked={form.capacity_visible}
                                onCheckedChange={(checked) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        capacity_visible: checked,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.durationMinutes")}</Label>
                            <Input
                                type="number"
                                min={5}
                                value={form.session_duration_minutes}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        session_duration_minutes: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceType")}</Label>
                            <Select
                                value={form.recurrence_type}
                                onValueChange={(value) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        recurrence_type: value as GroupRecurrenceType,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WEEKLY">{t("adminGroup.recurrence.weekly")}</SelectItem>
                                    <SelectItem value="MONTHLY">{t("adminGroup.recurrence.monthly")}</SelectItem>
                                    <SelectItem value="CUSTOM">{t("adminGroup.recurrence.custom")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.startTime")}</Label>
                            <Input
                                type="time"
                                value={form.start_time}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        start_time: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceStartDate")}</Label>
                            <Input
                                type="date"
                                value={form.recurrence_start_date}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        recurrence_start_date: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.recurrenceEndDate")}</Label>
                            <Input
                                type="date"
                                value={form.recurrence_end_date}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        recurrence_end_date: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                            <GroupLocationPicker
                                label={t("adminGroup.fields.location")}
                                value={form.location_text}
                                onChange={(nextValue) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        location_text: nextValue,
                                    }))
                                }
                                placeholder={storeLocationText || undefined}
                                defaultLatitude={storeLocation?.latitude ?? null}
                                defaultLongitude={storeLocation?.longitude ?? null}
                            />
                        </div>
                    </div>

                    {form.recurrence_type === "MONTHLY" ? (
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.monthdays")}</Label>
                            <Input
                                value={form.monthdays}
                                onChange={(e) =>
                                    onFormChange((prev) => ({
                                        ...prev,
                                        monthdays: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>{t("adminGroup.fields.weekdays")}</Label>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                {WEEKDAYS.map((day) => (
                                    <label
                                        key={day.value}
                                        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.weekdays.includes(day.value)}
                                            onChange={() => toggleWeekday(day.value)}
                                        />
                                        {day.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </AdminSectionCard>

                <AdminSectionCard
                    title={t("adminGroup.fields.coverImageUrl")}
                    description={t("adminGroup.fields.recommendedSize", { size: GROUP_MEDIA_RECOMMENDED_SIZE })}
                    className="min-w-0"
                    contentClassName="grid gap-4 lg:grid-cols-2 2xl:grid-cols-1"
                >
                    <MediaUploadField
                        title={t("adminGroup.fields.coverImageUrl")}
                        preview={coverImagePreview}
                        fallbackUrl={form.cover_image_url}
                        alt="Cover preview"
                        onSelectFile={onSelectCoverImage}
                    />
                    <MediaUploadField
                        title={t("adminGroup.fields.thumbnailUrl")}
                        preview={thumbnailImagePreview}
                        fallbackUrl={form.thumbnail_url}
                        alt="Thumbnail preview"
                        onSelectFile={onSelectThumbnailImage}
                    />
                </AdminSectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <AdminSectionCard title={t("adminGroup.staff.linkedStaff")} contentClassName="grid gap-2 sm:grid-cols-2">
                    {staff
                        .filter((member) => member.is_bookable)
                        .map((member) => (
                            <label
                                key={member.id}
                                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={form.linked_staff_ids.includes(member.id)}
                                    onChange={() => toggleLinkedStaff(member.id)}
                                />
                                <span className="truncate">{member.display_name}</span>
                            </label>
                        ))}
                </AdminSectionCard>

                <AdminSectionCard
                    title={t("adminGroup.staff.manualDisplay")}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                onFormChange((prev) => ({
                                    ...prev,
                                    manual_staff: [...prev.manual_staff, { ...EMPTY_MANUAL_STAFF }],
                                }))
                            }
                        >
                            {t("adminGroup.actions.add")}
                        </Button>
                    }
                    contentClassName="space-y-3"
                >
                    {form.manual_staff.length === 0 ? (
                        <p className="text-sm text-slate-500">{t("adminGroup.staff.manualEmpty")}</p>
                    ) : (
                        form.manual_staff.map((entry, index) => (
                            <div key={index} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-4">
                                <Input
                                    placeholder={t("adminGroup.fields.name")}
                                    value={entry.display_name}
                                    onChange={(e) =>
                                        onFormChange((prev) => ({
                                            ...prev,
                                            manual_staff: prev.manual_staff.map((item, itemIndex) =>
                                                itemIndex === index
                                                    ? { ...item, display_name: e.target.value }
                                                    : item,
                                            ),
                                        }))
                                    }
                                />
                                <Input
                                    placeholder={t("adminGroup.fields.phone")}
                                    value={entry.display_phone}
                                    onChange={(e) =>
                                        onFormChange((prev) => ({
                                            ...prev,
                                            manual_staff: prev.manual_staff.map((item, itemIndex) =>
                                                itemIndex === index
                                                    ? { ...item, display_phone: e.target.value }
                                                    : item,
                                            ),
                                        }))
                                    }
                                />
                                <Select
                                    value={entry.role}
                                    onValueChange={(value) =>
                                        onFormChange((prev) => ({
                                            ...prev,
                                            manual_staff: prev.manual_staff.map((item, itemIndex) =>
                                                itemIndex === index
                                                    ? { ...item, role: value as GroupStaffRole }
                                                    : item,
                                            ),
                                        }))
                                    }
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
                                    onClick={() =>
                                        onFormChange((prev) => ({
                                            ...prev,
                                            manual_staff: prev.manual_staff.filter((_, itemIndex) => itemIndex !== index),
                                        }))
                                    }
                                >
                                    {t("adminGroup.actions.remove")}
                                </Button>
                            </div>
                        ))
                    )}
                </AdminSectionCard>
            </div>

            {footer ? (
                <StickyActionBar actionsClassName="sm:min-w-0">
                    {footer}
                </StickyActionBar>
            ) : null}
        </div>
    );
}
