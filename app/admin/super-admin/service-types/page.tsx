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
import { Card, CardContent } from "@/components/ui/card";
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

interface GlobalServiceType {
    id: number;
    key: string;
    name: string;
    description?: string;
    categories_count?: number;
}

interface FormData {
    key: string;
    name: string;
    description: string;
}

const initialFormData: FormData = {
    key: "",
    name: "",
    description: "",
};

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function ServiceTypesPage() {
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

            if (!response.ok) throw new Error("Failed to fetch service types");

            const data = await response.json();
            setServiceTypes(data.data || data || []);
        } catch (err) {
            setLoading(false);
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin) {
            void fetchData();
        }
    }, [isAuthenticated, isSuperAdmin, fetchData]);

    // Filtered service types
    const filteredTypes = serviceTypes.filter((type) =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        setEditingType(type);
        setFormData({
            key: type.key,
            name: type.name,
            description: type.description || "",
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
        if (!formData.name.trim()) {
            setFormError("Name is required");
            return;
        }
        if (!formData.key.trim()) {
            setFormError("Key is required");
            return;
        }
        if (!/^[A-Z][A-Z0-9_]*$/.test(formData.key)) {
            setFormError("Key must be uppercase letters, numbers, and underscores (start with letter)");
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            const payload = {
                key: formData.key.trim(),
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
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
                throw new Error(data.message || data.error || "Failed to save service type");
            }

            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to save service type");
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
                throw new Error(data.message || data.error || "Failed to delete service type");
            }

            setIsDeleteDialogOpen(false);
            setDeletingType(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete service type");
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
                <span className="ml-2 text-slate-600">Loading service types...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Global Service Types</h1>
                    <p className="text-slate-500">Manage service types that salons can use for categorization</p>
                </div>
                <Button onClick={openAddModal} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service Type
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
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search service types..."
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
                            <TableHead>Key</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Categories Using</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    {searchQuery ? "No service types match your search" : "No service types yet. Create your first one!"}
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
                                    <TableCell className="font-medium">{type.name}</TableCell>
                                    <TableCell className="text-slate-500 max-w-[200px] truncate">
                                        {type.description || "--"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {type.categories_count || 0} categories
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
                                                title={(type.categories_count || 0) > 0 ? "Cannot delete: in use by categories" : "Delete"}
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
                            {editingType ? "Edit Service Type" : "Add Service Type"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingType
                                ? "Update the service type details"
                                : "Create a new global service type for salons to use"}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
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
                                placeholder="e.g., Haircut, Manicure, Massage"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="key">Key *</Label>
                            <Input
                                id="key"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                                placeholder="e.g., HAIRCUT, MANICURE"
                                className="font-mono"
                            />
                            <p className="text-xs text-slate-500">
                                Unique identifier. Uppercase letters, numbers, and underscores only.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of this service type..."
                                className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
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
                                className="bg-violet-600 hover:bg-violet-700"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : editingType ? (
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
                        <DialogTitle>Delete Service Type</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{deletingType?.name}&quot;?
                            This action cannot be undone.
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
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
