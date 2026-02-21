"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Plus,
    Pencil,
    Trash2,
    UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import type { SuperAdminShop, ShopUser } from "@/types/super-admin";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface AddUserFormData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    display_name: string;
    is_bookable: boolean;
}

const initialAddUserFormData: AddUserFormData = {
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "STAFF",
    display_name: "",
    is_bookable: true,
};

const roleColors: Record<string, string> = {
    OWNER: "bg-violet-100 text-violet-700",
    ADMIN: "bg-blue-100 text-blue-700",
    STAFF: "bg-emerald-100 text-emerald-700",
    CUSTOMER: "bg-slate-100 text-slate-600",
};

export default function ShopUsersPage() {
    const params = useParams();
    const shopId = params.id as string;
    const { isAuthenticated, loading: authLoading, user } = useAdminAuth();

    const [shop, setShop] = useState<SuperAdminShop | null>(null);
    const [users, setUsers] = useState<ShopUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Add user modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addFormData, setAddFormData] = useState<AddUserFormData>(initialAddUserFormData);
    const [addFormError, setAddFormError] = useState<string | null>(null);

    // Edit role modal
    const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ShopUser | null>(null);
    const [editRole, setEditRole] = useState<string>("");

    // Delete dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<ShopUser | null>(null);

    const [submitting, setSubmitting] = useState(false);

    // Fetch shop and users
    const fetchData = useCallback(async () => {
        console.log("Fetching shop and users for shop ID:", shopId);
        setLoading(true);
        setError(null);

        try {
            console.log("entra al try")
            const [shopRes, usersRes] = await Promise.all([
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), { credentials: "include" }),
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}/users`), { credentials: "include" }),
            ]);
            console.log("entra al try 2")
            if (!shopRes.ok) throw new Error("Failed to fetch shop");
            if (!usersRes.ok) throw new Error("Failed to fetch users");

            const shopData = await shopRes.json();
            const usersData = await usersRes.json();

            setShop(shopData.data || shopData);
            setUsers(usersData.data || []);
        } catch (err) {
            console.log("entra al catch")
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        if (isAuthenticated && user?.is_super_admin && shopId) {
            void fetchData();
        } else {
            console.log("no entra al if")
            console.log("isAuthenticated", isAuthenticated)
            console.log("user", user)
            console.log("shopId", shopId)
        }
    }, [isAuthenticated, user, shopId, fetchData]);

    // Open add user modal
    const openAddModal = () => {
        setAddFormData(initialAddUserFormData);
        setAddFormError(null);
        setIsAddModalOpen(true);
    };

    // Handle add user
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddFormError(null);

        if (!addFormData.email.trim()) {
            setAddFormError("Email is required");
            return;
        }
        if (!addFormData.password.trim()) {
            setAddFormError("Password is required for new users");
            return;
        }
        if (addFormData.password.length < 8) {
            setAddFormError("Password must be at least 8 characters");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                email: addFormData.email.trim(),
                password: addFormData.password,
                first_name: addFormData.first_name.trim() || undefined,
                last_name: addFormData.last_name.trim() || undefined,
                role: addFormData.role,
                display_name: addFormData.display_name.trim() || addFormData.first_name.trim() || addFormData.email.split("@")[0],
                is_bookable: addFormData.is_bookable,
            };

            const response = await fetch(getApiUrl(`/api/super-admin/shops/${shopId}/users`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to add user");
            }

            setIsAddModalOpen(false);
            await fetchData();
        } catch (err) {
            setAddFormError(err instanceof Error ? err.message : "Failed to add user");
        } finally {
            setSubmitting(false);
        }
    };

    // Open edit role modal
    const openEditRoleModal = (user: ShopUser) => {
        setEditingUser(user);
        setEditRole(user.role);
        setIsEditRoleModalOpen(true);
    };

    // Handle update role
    const handleUpdateRole = async () => {
        if (!editingUser) return;

        setSubmitting(true);
        try {
            const response = await fetch(
                getApiUrl(`/api/super-admin/shops/${shopId}/users/${editingUser.company_user_id}`),
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ role: editRole }),
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to update role");
            }

            setIsEditRoleModalOpen(false);
            setEditingUser(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update role");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete user
    const handleDeleteUser = async () => {
        if (!deletingUser) return;

        setSubmitting(true);
        try {
            const response = await fetch(
                getApiUrl(`/api/super-admin/shops/${shopId}/users/${deletingUser.company_user_id}`),
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to remove user");
            }

            setIsDeleteDialogOpen(false);
            setDeletingUser(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove user");
        } finally {
            setSubmitting(false);
        }
    };

    // Get user initials
    const getInitials = (user: ShopUser["user"]) => {
        if (user.first_name) return user.first_name.charAt(0).toUpperCase();
        if (user.name) return user.name.charAt(0).toUpperCase();
        return user.email.charAt(0).toUpperCase();
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="ml-2 text-slate-600">Loading users...</span>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Shop not found</p>
                <Link href="/admin/super-admin/shops">
                    <Button variant="outline" className="mt-4">
                        Back to Shops
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/super-admin/shops/${shopId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Shop
                        </Button>
                    </Link>
                </div>
                <Button onClick={openAddModal} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Users for {shop.name}</CardTitle>
                    <CardDescription>
                        Manage users and their roles for this shop
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                                Dismiss
                            </Button>
                        </div>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Display Name</TableHead>
                                <TableHead>Bookable</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No users assigned to this shop yet. Add your first user!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((shopUser) => (
                                    <TableRow key={shopUser.company_user_id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={shopUser.staff_profile?.image_url} />
                                                    <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
                                                        {getInitials(shopUser.user)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {shopUser.user.first_name || shopUser.user.name || "Unnamed"}
                                                        {shopUser.user.last_name ? ` ${shopUser.user.last_name}` : ""}
                                                    </p>
                                                    <p className="text-sm text-slate-500">{shopUser.user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={roleColors[shopUser.role] || roleColors.CUSTOMER}>
                                                {shopUser.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {shopUser.staff_profile?.display_name || "--"}
                                        </TableCell>
                                        <TableCell>
                                            {shopUser.staff_profile ? (
                                                <Badge variant={shopUser.staff_profile.is_bookable ? "default" : "secondary"}>
                                                    {shopUser.staff_profile.is_bookable ? "Yes" : "No"}
                                                </Badge>
                                            ) : (
                                                "--"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditRoleModal(shopUser)}
                                                    title="Edit Role"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setDeletingUser(shopUser);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                    title="Remove User"
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
                </CardContent>
            </Card>

            {/* Add User Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add User to {shop.name}</DialogTitle>
                        <DialogDescription>
                            Create a new user account and assign them to this shop
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddUser} className="space-y-4">
                        {addFormError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {addFormError}
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    value={addFormData.first_name}
                                    onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    value={addFormData.last_name}
                                    onChange={(e) => setAddFormData({ ...addFormData, last_name: e.target.value })}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={addFormData.email}
                                onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                placeholder="user@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={addFormData.password}
                                onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                placeholder="Minimum 8 characters"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                                value={addFormData.role}
                                onValueChange={(value: "OWNER" | "ADMIN" | "STAFF") =>
                                    setAddFormData({ ...addFormData, role: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OWNER">Owner - Full access</SelectItem>
                                    <SelectItem value="ADMIN">Admin - Manage shop settings</SelectItem>
                                    <SelectItem value="STAFF">Staff - View bookings only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="display_name">Display Name</Label>
                            <Input
                                id="display_name"
                                value={addFormData.display_name}
                                onChange={(e) => setAddFormData({ ...addFormData, display_name: e.target.value })}
                                placeholder="Name shown to customers"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                            <div>
                                <Label>Can receive bookings?</Label>
                                <p className="text-sm text-slate-500">Allow customers to book with this staff member</p>
                            </div>
                            <Switch
                                checked={addFormData.is_bookable}
                                onCheckedChange={(checked) => setAddFormData({ ...addFormData, is_bookable: checked })}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add User
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={isEditRoleModalOpen} onOpenChange={setIsEditRoleModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User Role</DialogTitle>
                        <DialogDescription>
                            Change the role for {editingUser?.user.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OWNER">Owner - Full access</SelectItem>
                                    <SelectItem value="ADMIN">Admin - Manage shop settings</SelectItem>
                                    <SelectItem value="STAFF">Staff - View bookings only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsEditRoleModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateRole}
                            disabled={submitting}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                "Save Role"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Remove User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove {deletingUser?.user.email} from this shop?
                            This will revoke their access but won&apos;t delete their account.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingUser(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={submitting}
                            className="bg-rose-500 hover:bg-rose-600"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Removing...
                                </>
                            ) : (
                                "Remove User"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
