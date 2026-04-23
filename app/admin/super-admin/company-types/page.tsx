"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useI18n, useT } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/i18n/localized";
import { notify } from "@/lib/notify";
import { AdminPageHeader, AdminPageShell, ConfirmDialog } from "@/components/admin/shared";

interface CompanyType {
    id: number;
    key: string;
    name: string;
    name_i18n?: Record<string, string>;
    description?: string | null;
    description_i18n?: Record<string, string>;
    icon_name?: string | null;
    is_active: boolean;
    companies_count?: number;
}

interface FormData {
    name: string;
    name_es: string;
    name_en: string;
    description: string;
    description_es: string;
    description_en: string;
    icon_name: string;
}

const initialFormData: FormData = {
    name: "",
    name_es: "",
    name_en: "",
    description: "",
    description_es: "",
    description_en: "",
    icon_name: "",
};

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function CompanyTypesPage() {
    const t = useT();
    const { locale } = useI18n();
    const { isAuthenticated, isSuperAdmin, loading: authLoading } = useAdminAuth();

    // State
    const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<CompanyType | null>(null);
    const [deletingType, setDeletingType] = useState<CompanyType | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Fetch company types
    const fetchData = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(getApiUrl("/api/super-admin/company-types"), {
                credentials: "include",
            });

            if (!response.ok) throw new Error(t("superAdminCompanyTypes.fetchError"));

            const data = await response.json();
            setCompanyTypes(data.data || data || []);
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("superAdminCompanyTypes.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin) {
            void fetchData();
        }
    }, [isAuthenticated, isSuperAdmin, fetchData]);

    const getTypeName = (type: CompanyType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

    const getTypeDescription = (type: CompanyType): string =>
        getLocalizedText({
            text: type.description,
            translations: type.description_i18n,
            locale,
        });

    // Filtered types
    const filteredTypes = companyTypes.filter((type) =>
        getTypeName(type).toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(type.name_i18n || {}).some((value) =>
            value.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        type.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Open modal for add/edit
    const openAddModal = () => {
        setEditingType(null);
        setFormData(initialFormData);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (type: CompanyType) => {
        const localizedName = getTypeName(type);
        const localizedDescription = getTypeDescription(type);

        setEditingType(type);
        setFormData({
            name: type.name || localizedName,
            name_es: type.name_i18n?.es || "",
            name_en: type.name_i18n?.en || "",
            description: type.description || localizedDescription || "",
            description_es: type.description_i18n?.es || "",
            description_en: type.description_i18n?.en || "",
            icon_name: type.icon_name || "",
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const effectiveName =
            formData.name.trim() ||
            formData.name_es.trim() ||
            formData.name_en.trim();

        if (!effectiveName) {
            const message = t("superAdminCompanyTypes.nameRequired");
            setFormError(message);
            void notify.warning(message);
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            const nameEs = formData.name_es.trim();
            const nameEn = formData.name_en.trim();
            const descriptionEs = formData.description_es.trim();
            const descriptionEn = formData.description_en.trim();

            const mergedNameI18n = {
                ...(editingType?.name_i18n || {}),
                ...(nameEs ? { es: nameEs } : {}),
                ...(nameEn ? { en: nameEn } : {}),
            };
            const mergedDescriptionI18n = {
                ...(editingType?.description_i18n || {}),
                ...(descriptionEs ? { es: descriptionEs } : {}),
                ...(descriptionEn ? { en: descriptionEn } : {}),
            };

            const payload = {
                name: effectiveName,
                description: formData.description.trim() || undefined,
                name_i18n: mergedNameI18n,
                description_i18n: mergedDescriptionI18n,
                icon_name: formData.icon_name.trim() || undefined,
            };

            const url = editingType
                ? getApiUrl(`/api/super-admin/company-types/${editingType.id}`)
                : getApiUrl("/api/super-admin/company-types");

            const response = await fetch(url, {
                method: editingType ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminCompanyTypes.saveError"));
            }

            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t("superAdminCompanyTypes.saveError"));
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingType) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/super-admin/company-types/${deletingType.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminCompanyTypes.deleteError"));
            }

            setIsDeleteDialogOpen(false);
            setDeletingType(null);
            await fetchData();
        } catch (err) {
            void notify.error(err instanceof Error ? err.message : t("superAdminCompanyTypes.deleteError"));
            setIsDeleteDialogOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-admin-brand" />
                <span className="ml-2 text-slate-600">{t("superAdminCompanyTypes.loading")}</span>
            </div>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("superAdminCompanyTypes.title")}
                subtitle={t("superAdminCompanyTypes.subtitle")}
                actions={
                    <Button onClick={openAddModal} className="bg-admin-brand hover:bg-admin-brand-hover text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("superAdminCompanyTypes.add")}
                    </Button>
                }
            />

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t("superAdminCompanyTypes.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("superAdminCompanyTypes.key")}</TableHead>
                            <TableHead>{t("superAdminCompanyTypes.name")}</TableHead>
                            <TableHead>{t("superAdminCompanyTypes.description")}</TableHead>
                            <TableHead>{t("superAdminCompanyTypes.iconName")}</TableHead>
                            <TableHead>{t("superAdminCompanyTypes.shopsUsing")}</TableHead>
                            <TableHead>{t("adminBookings.status")}</TableHead>
                            <TableHead className="text-right">{t("adminCustomers.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                    {searchQuery ? t("superAdminCompanyTypes.noSearchResults") : t("superAdminCompanyTypes.noTypes")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTypes.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell>
                                        <code className="px-2 py-1 rounded bg-slate-100 text-sm font-mono">
                                            {type.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="font-medium">{getTypeName(type)}</TableCell>
                                    <TableCell className="text-slate-500 max-w-[200px] truncate">
                                        {getTypeDescription(type) || t("superAdminCompanyTypes.empty")}
                                    </TableCell>
                                    <TableCell className="text-slate-500">
                                        {type.icon_name || t("superAdminCompanyTypes.empty")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {t("superAdminCompanyTypes.shopsCount", { count: type.companies_count || 0 })}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={type.is_active
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                        }>
                                            {type.is_active ? t("adminServices.active") : t("adminServices.inactive")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditModal(type)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setDeletingType(type);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                disabled={(type.companies_count || 0) > 0}
                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                            >
                                                <span title={(type.companies_count || 0) > 0 ? t("superAdminCompanyTypes.cannotDeleteInUse") : t("common.delete")}>
                                                    <Trash2 className="h-4 w-4" />
                                                </span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingType ? t("superAdminCompanyTypes.edit") : t("superAdminCompanyTypes.add")}
                        </DialogTitle>
                        <DialogDescription>
                            {editingType
                                ? t("superAdminCompanyTypes.editDescription")
                                : t("superAdminCompanyTypes.createDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">{t("superAdminCompanyTypes.nameRequiredLabel")}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t("superAdminCompanyTypes.namePlaceholder")}
                            />
                            <p className="text-xs text-slate-500">
                                {t("superAdminCompanyTypes.keyAutoGenerated")}
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name_es">{t("superAdminCompanyTypes.nameEs")}</Label>
                                <Input
                                    id="name_es"
                                    value={formData.name_es}
                                    onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
                                    placeholder={t("superAdminCompanyTypes.nameEsPlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name_en">{t("superAdminCompanyTypes.nameEn")}</Label>
                                <Input
                                    id="name_en"
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                    placeholder={t("superAdminCompanyTypes.nameEnPlaceholder")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t("superAdminCompanyTypes.description")}</Label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t("superAdminCompanyTypes.descriptionPlaceholder")}
                                className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-admin-brand"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="description_es">{t("superAdminCompanyTypes.descriptionEs")}</Label>
                                <textarea
                                    id="description_es"
                                    value={formData.description_es}
                                    onChange={(e) => setFormData({ ...formData, description_es: e.target.value })}
                                    placeholder={t("superAdminCompanyTypes.descriptionEsPlaceholder")}
                                    className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-admin-brand"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description_en">{t("superAdminCompanyTypes.descriptionEn")}</Label>
                                <textarea
                                    id="description_en"
                                    value={formData.description_en}
                                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                                    placeholder={t("superAdminCompanyTypes.descriptionEnPlaceholder")}
                                    className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-admin-brand"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="icon_name">{t("superAdminCompanyTypes.iconNameLabel")}</Label>
                            <Input
                                id="icon_name"
                                value={formData.icon_name}
                                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                                placeholder={t("superAdminCompanyTypes.iconNamePlaceholder")}
                            />
                            <p className="text-xs text-slate-500">
                                {t("superAdminCompanyTypes.iconNameHelp")}
                            </p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-admin-brand hover:bg-admin-brand-hover"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t("superAdminCompanyTypes.saving")}
                                    </>
                                ) : editingType ? (
                                    t("superAdminCompanyTypes.update")
                                ) : (
                                    t("superAdminCompanyTypes.create")
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) setDeletingType(null);
                }}
                title={t("superAdminCompanyTypes.deleteTitle")}
                description={t("superAdminCompanyTypes.deleteConfirm", {
                    name: deletingType ? getTypeName(deletingType) : "",
                })}
                confirmLabel={submitting ? t("superAdminCompanyTypes.deleting") : t("common.delete")}
                cancelLabel={t("common.cancel")}
                variant="destructive"
                loading={submitting}
                onConfirm={handleDelete}
            />
        </AdminPageShell>
    );
}
