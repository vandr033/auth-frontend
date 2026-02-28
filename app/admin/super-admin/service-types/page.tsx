"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    AlertCircle,
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

interface GlobalServiceType {
    id: number;
    key: string;
    name: string;
    name_i18n?: Record<string, string>;
    description?: string;
    description_i18n?: Record<string, string>;
    categories_count?: number;
}

interface FormData {
    key: string;
    name: string;
    name_es: string;
    name_en: string;
    description: string;
    description_es: string;
    description_en: string;
}

const initialFormData: FormData = {
    key: "",
    name: "",
    name_es: "",
    name_en: "",
    description: "",
    description_es: "",
    description_en: "",
};

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function ServiceTypesPage() {
    const t = useT();
    const { locale } = useI18n();
    const { isAuthenticated, isSuperAdmin, loading: authLoading } = useAdminAuth();

    // State
    const [serviceTypes, setServiceTypes] = useState<GlobalServiceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<GlobalServiceType | null>(null);
    const [deletingType, setDeletingType] = useState<GlobalServiceType | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Fetch service types
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl("/api/super-admin/service-types"), {
                credentials: "include",
            });

            if (!response.ok) throw new Error(t("superAdminServiceTypes.fetchError"));

            const data = await response.json();
            setServiceTypes(data.data || data || []);
        } catch (err) {
            setLoading(false);
            setError(err instanceof Error ? err.message : t("superAdminServiceTypes.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin) {
            void fetchData();
        }
    }, [isAuthenticated, isSuperAdmin, fetchData]);

    const getTypeName = (type: GlobalServiceType): string =>
        getLocalizedText({
            text: type.name,
            translations: type.name_i18n,
            locale,
        });

    const getTypeDescription = (type: GlobalServiceType): string =>
        getLocalizedText({
            text: type.description,
            translations: type.description_i18n,
            locale,
        });

    // Filtered service types
    const filteredTypes = serviceTypes.filter((type) =>
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

    const openEditModal = (type: GlobalServiceType) => {
        const localizedName = getTypeName(type);
        const localizedDescription = getTypeDescription(type);

        setEditingType(type);
        setFormData({
            key: type.key,
            name: type.name || localizedName,
            name_es: type.name_i18n?.es || "",
            name_en: type.name_i18n?.en || "",
            description: type.description || localizedDescription || "",
            description_es: type.description_i18n?.es || "",
            description_en: type.description_i18n?.en || "",
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    // Generate key from name
    const generateKey = (name: string): string => {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const effectiveName =
            formData.name.trim() ||
            formData.name_es.trim() ||
            formData.name_en.trim();

        if (!effectiveName) {
            setFormError(t("superAdminServiceTypes.nameRequired"));
            return;
        }
        if (!formData.key.trim()) {
            setFormError(t("superAdminServiceTypes.keyRequired"));
            return;
        }
        if (!/^[A-Z][A-Z0-9_]*$/.test(formData.key)) {
            setFormError(t("superAdminServiceTypes.keyFormatError"));
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
                key: formData.key.trim(),
                name: effectiveName,
                description: formData.description.trim() || undefined,
                name_i18n: mergedNameI18n,
                description_i18n: mergedDescriptionI18n,
            };

            const url = editingType
                ? getApiUrl(`/api/super-admin/service-types/${editingType.id}`)
                : getApiUrl("/api/super-admin/service-types");

            const response = await fetch(url, {
                method: editingType ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminServiceTypes.saveError"));
            }

            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t("superAdminServiceTypes.saveError"));
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingType) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/super-admin/service-types/${deletingType.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || t("superAdminServiceTypes.deleteError"));
            }

            setIsDeleteDialogOpen(false);
            setDeletingType(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("superAdminServiceTypes.deleteError"));
            setIsDeleteDialogOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="ml-2 text-slate-600">{t("superAdminServiceTypes.loading")}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t("superAdminServiceTypes.title")}</h1>
                    <p className="text-slate-500">{t("superAdminServiceTypes.subtitle")}</p>
                </div>
                <Button onClick={openAddModal} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("superAdminServiceTypes.add")}
                </Button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-auto"
                    >
                        {t("imageUpload.dismiss")}
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={t("superAdminServiceTypes.searchPlaceholder")}
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
                            <TableHead>{t("superAdminServiceTypes.key")}</TableHead>
                            <TableHead>{t("superAdminServiceTypes.name")}</TableHead>
                            <TableHead>{t("superAdminServiceTypes.description")}</TableHead>
                            <TableHead>{t("superAdminServiceTypes.categoriesUsing")}</TableHead>
                            <TableHead className="text-right">{t("adminCustomers.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    {searchQuery ? t("superAdminServiceTypes.noSearchResults") : t("superAdminServiceTypes.noTypes")}
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
                                        {getTypeDescription(type) || t("superAdminServiceTypes.empty")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {t("superAdminServiceTypes.categoriesCount", { count: type.categories_count || 0 })}
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
                                                disabled={(type.categories_count || 0) > 0}
                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                                title={(type.categories_count || 0) > 0 ? t("superAdminServiceTypes.cannotDeleteInUse") : t("common.delete")}
                                            >
                                                <Trash2 className="h-4 w-4" />
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
                            {editingType ? t("superAdminServiceTypes.edit") : t("superAdminServiceTypes.add")}
                        </DialogTitle>
                        <DialogDescription>
                            {editingType
                                ? t("superAdminServiceTypes.editDescription")
                                : t("superAdminServiceTypes.createDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">{t("superAdminServiceTypes.nameRequiredLabel")}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setFormData({
                                        ...formData,
                                        name,
                                        key: editingType ? formData.key : generateKey(name),
                                    });
                                }}
                                placeholder={t("superAdminServiceTypes.namePlaceholder")}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name_es">{t("superAdminServiceTypes.nameEs")}</Label>
                                <Input
                                    id="name_es"
                                    value={formData.name_es}
                                    onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
                                    placeholder={t("superAdminServiceTypes.nameEsPlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name_en">{t("superAdminServiceTypes.nameEn")}</Label>
                                <Input
                                    id="name_en"
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                    placeholder={t("superAdminServiceTypes.nameEnPlaceholder")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="key">{t("superAdminServiceTypes.keyRequiredLabel")}</Label>
                            <Input
                                id="key"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                                placeholder={t("superAdminServiceTypes.keyPlaceholder")}
                                className="font-mono"
                            />
                            <p className="text-xs text-slate-500">
                                {t("superAdminServiceTypes.keyHelp")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t("superAdminServiceTypes.description")}</Label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t("superAdminServiceTypes.descriptionPlaceholder")}
                                className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="description_es">{t("superAdminServiceTypes.descriptionEs")}</Label>
                                <textarea
                                    id="description_es"
                                    value={formData.description_es}
                                    onChange={(e) => setFormData({ ...formData, description_es: e.target.value })}
                                    placeholder={t("superAdminServiceTypes.descriptionEsPlaceholder")}
                                    className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description_en">{t("superAdminServiceTypes.descriptionEn")}</Label>
                                <textarea
                                    id="description_en"
                                    value={formData.description_en}
                                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                                    placeholder={t("superAdminServiceTypes.descriptionEnPlaceholder")}
                                    className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
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
                                className="bg-violet-600 hover:bg-violet-700"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t("superAdminServiceTypes.saving")}
                                    </>
                                ) : editingType ? (
                                    t("superAdminServiceTypes.update")
                                ) : (
                                    t("superAdminServiceTypes.create")
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
                        <DialogTitle>{t("superAdminServiceTypes.deleteTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("superAdminServiceTypes.deleteConfirm", {
                                name: deletingType ? getTypeName(deletingType) : "",
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingType(null);
                            }}
                        >
                            {t("common.cancel")}
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
                                    {t("superAdminServiceTypes.deleting")}
                                </>
                            ) : (
                                t("common.delete")
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
