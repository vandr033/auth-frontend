"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    getMyStaffProfile,
    updateMyStaffProfile,
    getMyUserProfile,
    updateMyUserProfile,
    type UserSelfProfile,
} from "@/app/admin/lib/adminApi";
import { notify } from "@/lib/notify";

function getApiUrl(path: string): string {
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

function getApiErrorMessage(data: unknown, status: number, fallback: string): string {
    if (data && typeof data === "object") {
        const payload = data as { message?: unknown; error?: unknown; technicalMessage?: unknown };
        if (typeof payload.message === "string" && payload.message.trim().length > 0) return payload.message;
        if (typeof payload.error === "string" && payload.error.trim().length > 0) return payload.error;
        if (typeof payload.technicalMessage === "string" && payload.technicalMessage.trim().length > 0) {
            return payload.technicalMessage;
        }
    }
    return status ? `Request failed with status ${status}` : fallback;
}

export default function AdminProfilePage() {
    const t = useT();
    const { role } = useAdminAuth();

    const isStaff = role === "STAFF";
    const canAccess = role === "STAFF" || role === "OWNER" || role === "ADMIN";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userProfile, setUserProfile] = useState<UserSelfProfile | null>(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [phonePrefix, setPhonePrefix] = useState("591");
    const [phone, setPhone] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        if (!canAccess) return;

        setLoading(true);

        const load = async () => {
            try {
                if (isStaff) {
                    const data = await getMyStaffProfile();
                    setUserProfile(data.user as UserSelfProfile);
                    setFirstName(data.user.first_name || "");
                    setLastName(data.user.last_name || "");
                    setDisplayName(data.display_name || "");
                    setBio(data.bio || "");
                    setPhonePrefix(data.user.phone_prefix || "591");
                    setPhone(data.user.phoneNumber || "");
                    return;
                }

                const data = await getMyUserProfile();
                setUserProfile(data);
                setFirstName(data.first_name || "");
                setLastName(data.last_name || "");
                setDisplayName("");
                setBio("");
                setPhonePrefix(data.phone_prefix || "591");
                setPhone(data.phoneNumber || "");
            } catch (err: unknown) {
                void notify.error(err instanceof Error ? err.message : t("staffProfile.loadError"));
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [canAccess, isStaff, t]);

    const handleSave = async () => {
        if (!canAccess) return;

        setSaving(true);
        try {
            if (isStaff) {
                const updated = await updateMyStaffProfile({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    display_name: displayName.trim(),
                    bio: bio.trim(),
                    phone_prefix: phonePrefix.trim(),
                    phone: phone.trim(),
                });
                setUserProfile(updated.user as UserSelfProfile);
                setFirstName(updated.user.first_name || "");
                setLastName(updated.user.last_name || "");
                setDisplayName(updated.display_name || "");
                setBio(updated.bio || "");
                setPhonePrefix(updated.user.phone_prefix || "591");
                setPhone(updated.user.phoneNumber || "");
            } else {
                const updated = await updateMyUserProfile({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone_prefix: phonePrefix.trim(),
                    phone: phone.trim(),
                });
                setUserProfile(updated);
                setFirstName(updated.first_name || "");
                setLastName(updated.last_name || "");
                setPhonePrefix(updated.phone_prefix || "591");
                setPhone(updated.phoneNumber || "");
            }

            await notify.success(t("staffProfile.saveSuccess"));
        } catch (err: unknown) {
            await notify.error(err instanceof Error ? err.message : t("staffProfile.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canAccess) return;

        if (newPassword.length < 8) {
            await notify.error(t("staffProfile.passwordMinError"));
            return;
        }

        if (newPassword !== confirmPassword) {
            await notify.error(t("staffProfile.passwordMismatchError"));
            return;
        }

        setChangingPassword(true);
        try {
            const response = await fetch(getApiUrl("/api/admin/auth/change-password"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, response.status, t("staffProfile.passwordSaveError")));
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            await notify.success(t("staffProfile.passwordSaveSuccess"));
        } catch (err: unknown) {
            await notify.error(err instanceof Error ? err.message : t("staffProfile.passwordSaveError"));
        } finally {
            setChangingPassword(false);
        }
    };

    if (!canAccess) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-admin-brand" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">{t("staffProfile.title")}</h2>
                <p className="text-sm text-slate-500 mt-1">{t("staffProfile.subtitle")}</p>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>{t("staffProfile.account")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-first-name">{t("staffProfile.firstName")}</Label>
                            <Input
                                id="profile-first-name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profile-last-name">{t("staffProfile.lastName")}</Label>
                            <Input
                                id="profile-last-name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="profile-email">{t("staffProfile.email")}</Label>
                        <Input id="profile-email" value={userProfile?.email || ""} disabled />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                        <div className="space-y-2 sm:col-span-1">
                            <Label htmlFor="profile-phone-prefix">{t("adminSettings.prefix")}</Label>
                            <Input
                                id="profile-phone-prefix"
                                value={phonePrefix}
                                onChange={(e) => setPhonePrefix(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-3">
                            <Label htmlFor="profile-phone">{t("staffProfile.phone")}</Label>
                            <Input
                                id="profile-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isStaff && (
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle>{t("staffProfile.publicProfile")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff-display-name">{t("staffProfile.displayName")}</Label>
                            <Input
                                id="staff-display-name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="staff-bio">{t("staffProfile.bio")}</Label>
                            <textarea
                                id="staff-bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                disabled={saving}
                                rows={4}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>{t("staffProfile.security")}</CardTitle>
                    <CardDescription>{t("staffProfile.securitySubtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleChangePassword}>
                        <div className="space-y-2">
                            <Label htmlFor="profile-current-password">{t("staffProfile.currentPassword")}</Label>
                            <Input
                                id="profile-current-password"
                                type="password"
                                autoComplete="current-password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={changingPassword}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-new-password">{t("staffProfile.newPassword")}</Label>
                            <Input
                                id="profile-new-password"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={changingPassword}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-confirm-password">{t("staffProfile.confirmPassword")}</Label>
                            <Input
                                id="profile-confirm-password"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={changingPassword}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                            className="bg-admin-brand hover:bg-admin-brand-hover text-white"
                        >
                            {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {changingPassword ? t("staffProfile.updatingPassword") : t("staffProfile.updatePassword")}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <StickyFormActions
                onSave={handleSave}
                loading={saving}
                disabled={firstName.trim().length === 0}
                saveLabel={t("staffProfile.save")}
                loadingLabel={t("staffProfile.saving")}
                saveClassName="bg-admin-brand hover:bg-admin-brand-hover text-white"
            />
        </div>
    );
}
