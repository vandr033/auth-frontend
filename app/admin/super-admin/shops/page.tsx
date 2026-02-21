"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    AlertCircle,
    Users,
    ExternalLink,
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
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import type { SuperAdminShop } from "@/types/super-admin";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function ShopsPage() {
    const { isAuthenticated, isSuperAdmin, loading: authLoading } = useAdminAuth();

    // State
    const [shops, setShops] = useState<SuperAdminShop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Delete dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingShop, setDeletingShop] = useState<SuperAdminShop | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Fetch shops
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl("/api/super-admin/shops"), {
                credentials: "include",
            });

            if (!response.ok) throw new Error("Failed to fetch shops");

            const data = await response.json();
            // Handle both { data: { shops: [...] } } and { data: [...] } response formats
            const shopsList = data.data?.shops || data.data || [];
            setShops(shopsList);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load shops");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && isSuperAdmin) {
            void fetchData();
        }
    }, [isAuthenticated, isSuperAdmin, fetchData]);

    // Filtered shops
    const filteredShops = shops.filter((shop) =>
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (shop.city?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    // Handle delete
    const handleDelete = async () => {
        if (!deletingShop) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/super-admin/shops/${deletingShop.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to delete shop");
            }

            setIsDeleteDialogOpen(false);
            setDeletingShop(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete shop");
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
                <span className="ml-2 text-slate-600">Loading shops...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Shops</h1>
                    <p className="text-slate-500">Manage all registered shops and their users</p>
                </div>
                <Link href="/admin/super-admin/shops/new">
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Shop
                    </Button>
                </Link>
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
                    placeholder="Search shops by name, slug, or city..."
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
                            <TableHead>Shop</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredShops.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    {searchQuery ? "No shops match your search" : "No shops yet. Create your first one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredShops.map((shop) => (
                                <TableRow key={shop.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{shop.name}</p>
                                            <p className="text-sm text-slate-500">{shop.slug}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {shop.city || shop.state || "Not set"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {shop.company_type?.name || "Unknown"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {shop.user_count || 0} users
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={shop.is_active
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                        }>
                                            {shop.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={`/admin/super-admin/shops/${shop.id}/users`}>
                                                <Button variant="ghost" size="sm" title="Manage Users">
                                                    <Users className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/admin/super-admin/shops/${shop.id}`}>
                                                <Button variant="ghost" size="sm" title="Edit Shop">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/shop/${shop.slug}`} target="_blank">
                                                <Button variant="ghost" size="sm" title="View Public Page">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setDeletingShop(shop);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                title="Delete Shop"
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Shop</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{deletingShop?.name}&quot;?
                            This will also remove all associated users, services, and bookings.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingShop(null);
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
