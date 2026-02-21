"use client";

import React, { useState } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Tag,
    FolderOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface GlobalServiceType {
    id: number;
    key: string;
    name: string;
    description?: string;
}

interface Category {
    id: number;
    name: string;
    company_id: number;
    position?: number;
    global_service_type_id?: number;
    global_service_type?: GlobalServiceType;
}

interface CategoriesSectionProps {
    categories: Category[];
    globalServiceTypes: GlobalServiceType[];
    companyId: number;
    onCategoriesChange: () => void;
    getApiUrl: (path: string) => string;
}

export function CategoriesSection({
    categories,
    globalServiceTypes,
    companyId,
    onCategoriesChange,
    getApiUrl,
}: CategoriesSectionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formServiceTypeId, setFormServiceTypeId] = useState<number | null>(null);

    // Sort categories by position
    const sortedCategories = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));

    const openAddModal = () => {
        setEditingCategory(null);
        setFormName("");
        setFormServiceTypeId(null);
        setError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setFormName(category.name);
        setFormServiceTypeId(category.global_service_type_id || null);
        setError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formName.trim()) {
            setError("Category name is required");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                name: formName.trim(),
                company_id: companyId,
                global_service_type_id: formServiceTypeId || undefined,
            };

            const url = editingCategory
                ? getApiUrl(`/api/admin/categories/${editingCategory.id}`)
                : getApiUrl("/api/admin/categories");

            const response = await fetch(url, {
                method: editingCategory ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || "Failed to save category");
            }

            setIsModalOpen(false);
            onCategoriesChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save category");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingCategory) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/admin/categories/${deletingCategory.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete category");
            }

            setIsDeleteDialogOpen(false);
            setDeletingCategory(null);
            onCategoriesChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete category");
        } finally {
            setSubmitting(false);
        }
    };

    const getServiceTypeName = (category: Category): string => {
        if (category.global_service_type) {
            return category.global_service_type.name;
        }
        if (category.global_service_type_id) {
            const type = globalServiceTypes.find(t => t.id === category.global_service_type_id);
            return type?.name || "--";
        }
        return "--";
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg font-semibold">Categories</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">Organize your services into categories</p>
                    </div>
                    <Button onClick={openAddModal} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Category
                    </Button>
                </CardHeader>
                <CardContent>
                    {sortedCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <FolderOpen className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-slate-500 mb-2">No categories yet</p>
                            <p className="text-sm text-slate-400">Create your first category to organize services</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {sortedCategories.map((category) => (
                                <div
                                    key={category.id}
                                    className="group relative rounded-xl border border-slate-200 bg-white p-4 hover:border-orange-200 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                                    <Tag className="h-4 w-4 text-orange-500" />
                                                </div>
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {category.name}
                                                </h3>
                                            </div>
                                            {getServiceTypeName(category) !== "--" && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {getServiceTypeName(category)}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => openEditModal(category)}
                                            >
                                                <Pencil className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                onClick={() => {
                                                    setDeletingCategory(category);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Category Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? "Edit Category" : "Add Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Update the category details"
                                : "Create a new category for your services"}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Category Name *</Label>
                            <Input
                                id="cat-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g., Haircuts, Coloring"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-service-type">Service Type (optional)</Label>
                            <Select
                                value={formServiceTypeId?.toString() || "none"}
                                onValueChange={(val) => setFormServiceTypeId(val === "none" ? null : parseInt(val))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- No specific type --</SelectItem>
                                    {globalServiceTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Categorize under a global service type for better organization
                            </p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : editingCategory ? (
                                    "Update"
                                ) : (
                                    "Create"
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
                        <DialogTitle>Delete Category</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{deletingCategory?.name}&quot;?
                            Services in this category will become uncategorized.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingCategory(null);
                            }}
                        >
                            Cancel
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
                                    Deleting...
                                </>
                            ) : (
                                "Delete Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
