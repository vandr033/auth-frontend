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
import { useT } from "@/lib/i18n";
import type { SuperAdminShop, ShopUser } from "@/types/super-admin";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

interface AddUserFormData {
    email: string;
    phone_prefix: string;
    phone: string;
    password: string;
    first_name: string;
    last_name: string;
    role: "OWNER" | "ADMIN" | "STAFF";
    display_name: string;
    is_bookable: boolean;
}

const initialAddUserFormData: AddUserFormData = {
    email: "",
    phone_prefix: "591",
    phone: "",
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
    const t = useT();
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
        setLoading(true);
        setError(null);

        try {
            const [shopRes, usersRes] = await Promise.all([
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}`), { credentials: "include" }),
                fetch(getApiUrl(`/api/super-admin/shops/${shopId}/users`), { credentials: "include" }),
            ]);
            if (!shopRes.ok) throw new Error(t("superAdminShops.fetchShopError"));
            if (!usersRes.ok) throw new Error(t("superAdminShops.fetchUsersError"));

            const shopData = await shopRes.json();
            const usersData = await usersRes.json();

            setShop(shopData.data || shopData);
            setUsers(usersData.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : t("superAdminShops.loadUsersError"));
        } finally {
            setLoading(false);
        }
    }, [shopId, t]);

    useEffect(() => {
        if (isAuthenticated && user?.is_super_admin && shopId) {
            void fetchData();
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
            setAddFormError(t("superAdminShops.emailRequired"));
            return;
        }
        if (!addFormData.password.trim()) {
            setAddFormError(t("superAdminShops.passwordRequired"));
            return;
        }
        if (addFormData.password.length < 8) {
            setAddFormError(t("superAdminShops.passwordMin"));
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                email: addFormData.email.trim(),
                phone_prefix: addFormData.phone_prefix.trim() || undefined,
                phone: addFormData.phone.trim() || undefined,
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
                throw new Error(data.message || data.error || t("superAdminShops.addUserFailed"));
            }

            setIsAddModalOpen(false);
            await fetchData();
        } catch (err) {
            setAddFormError(err instanceof Error ? err.message : t("superAdminShops.addUserFailed"));
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
                throw new Error(data.message || data.error || t("superAdminShops.updateRoleFailed"));
            }

            setIsEditRoleModalOpen(false);
            setEditingUser(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("superAdminShops.updateRoleFailed"));
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
                throw new Error(data.message || data.error || t("superAdminShops.removeUserFailed"));
            }

            setIsDeleteDialogOpen(false);
            setDeletingUser(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("superAdminShops.removeUserFailed"));
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
                <span className="ml-2 text-slate-600">{t("superAdminShops.loadingUsers")}</span>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">{t("superAdminShops.shopNotFound")}</p>
                <Link href="/admin/super-admin/shops">
                    <Button variant="outline" className="mt-4">
                        {t("superAdminShops.backToShops")}
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
                            {t("superAdminShops.backToShop")}
                        </Button>
                    </Link>
                </div>
                <Button onClick={openAddModal} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("superAdminShops.addUser")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("superAdminShops.usersForShop", { name: shop.name })}</CardTitle>
                    <CardDescription>
                        {t("superAdminShops.manageUsersDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                                {t("imageUpload.dismiss")}
                            </Button>
                        </div>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("superAdminShops.user")}</TableHead>
                                <TableHead>{t("adminBookings.status")}</TableHead>
                                <TableHead>{t("superAdminShops.displayName")}</TableHead>
                                <TableHead>{t("adminStaff.bookable")}</TableHead>
                                <TableHead className="text-right">{t("adminCustomers.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        {t("superAdminShops.noUsers")}
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
                                                        {shopUser.user.first_name || shopUser.user.name || t("superAdminShops.unnamed")}
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
                                                    {shopUser.staff_profile.is_bookable ? t("superAdminShops.yes") : t("superAdminShops.no")}
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
                                                    title={t("superAdminShops.editRole")}
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
                                                    title={t("superAdminShops.removeUser")}
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
                        <DialogTitle>{t("superAdminShops.addUserToShop", { name: shop.name })}</DialogTitle>
                        <DialogDescription>
                            {t("superAdminShops.addUserDescription")}
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
                                <Label htmlFor="first_name">{t("superAdminShops.firstName")}</Label>
                                <Input
                                    id="first_name"
                                    value={addFormData.first_name}
                                    onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                                    placeholder={t("superAdminShops.firstNamePlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">{t("superAdminShops.lastName")}</Label>
                                <Input
                                    id="last_name"
                                    value={addFormData.last_name}
                                    onChange={(e) => setAddFormData({ ...addFormData, last_name: e.target.value })}
                                    placeholder={t("superAdminShops.lastNamePlaceholder")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">{t("superAdminShops.emailRequiredLabel")}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={addFormData.email}
                                onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                placeholder={t("superAdminShops.userEmailPlaceholder")}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2 sm:col-span-1">
                                <Label htmlFor="phone_prefix">{t("superAdminShops.countryCode")}</Label>
                                <Input
                                    id="phone_prefix"
                                    value={addFormData.phone_prefix}
                                    onChange={(e) => setAddFormData({ ...addFormData, phone_prefix: e.target.value })}
                                    placeholder="591"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="phone">{t("adminCustomers.phone")}</Label>
                                <Input
                                    id="phone"
                                    value={addFormData.phone}
                                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                                    placeholder="70000000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{t("superAdminShops.passwordRequiredLabel")}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={addFormData.password}
                                onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                placeholder={t("superAdminShops.passwordPlaceholder")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">{t("superAdminShops.roleRequiredLabel")}</Label>
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
                                    <SelectItem value="OWNER">{t("superAdminShops.roleOwner")}</SelectItem>
                                    <SelectItem value="ADMIN">{t("superAdminShops.roleAdmin")}</SelectItem>
                                    <SelectItem value="STAFF">{t("superAdminShops.roleStaff")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="display_name">{t("superAdminShops.displayName")}</Label>
                            <Input
                                id="display_name"
                                value={addFormData.display_name}
                                onChange={(e) => setAddFormData({ ...addFormData, display_name: e.target.value })}
                                placeholder={t("superAdminShops.displayNamePlaceholder")}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                            <div>
                                <Label>{t("superAdminShops.canReceiveBookings")}</Label>
                                <p className="text-sm text-slate-500">{t("superAdminShops.canReceiveBookingsHint")}</p>
                            </div>
                            <Switch
                                checked={addFormData.is_bookable}
                                onCheckedChange={(checked) => setAddFormData({ ...addFormData, is_bookable: checked })}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t("superAdminShops.adding")}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t("superAdminShops.addUser")}
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
                        <DialogTitle>{t("superAdminShops.editUserRole")}</DialogTitle>
                        <DialogDescription>
                            {t("superAdminShops.changeRoleFor", { email: editingUser?.user.email || "" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("superAdminShops.role")}</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OWNER">{t("superAdminShops.roleOwner")}</SelectItem>
                                    <SelectItem value="ADMIN">{t("superAdminShops.roleAdmin")}</SelectItem>
                                    <SelectItem value="STAFF">{t("superAdminShops.roleStaff")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsEditRoleModalOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleUpdateRole}
                            disabled={submitting}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    {t("superAdminShops.saving")}
                                </>
                            ) : (
                                t("superAdminShops.saveRole")
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("superAdminShops.removeUser")}</DialogTitle>
                        <DialogDescription>
                            {t("superAdminShops.removeUserConfirm", { email: deletingUser?.user.email || "" })}
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
                            {t("common.cancel")}
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
                                    {t("superAdminShops.removing")}
                                </>
                            ) : (
                                t("superAdminShops.removeUser")
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
