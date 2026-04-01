"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function getApiUrl(path: string): string {
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function AdminChangePasswordPage() {
    const t = useT();
    const router = useRouter();
    const {
        user,
        isAuthenticated,
        loading,
        mustChangePassword,
        refreshSession,
        signOut,
    } = useAdminAuth();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace("/admin/login");
            return;
        }

        if (!loading && isAuthenticated && !mustChangePassword) {
            if (user?.is_super_admin) {
                router.replace("/admin/super-admin");
            } else {
                router.replace("/admin/dashboard");
            }
        }
    }, [loading, isAuthenticated, mustChangePassword, user?.is_super_admin, router]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setStatus(null);

        if (newPassword.length < 8) {
            setError(t("adminChangePassword.newPasswordMin"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t("adminChangePassword.mismatch"));
            return;
        }

        setSubmitting(true);
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

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || t("adminChangePassword.genericError"));
            }

            setStatus(t("adminChangePassword.success"));
            await refreshSession(true);

            if (user?.is_super_admin) {
                router.replace("/admin/super-admin");
            } else {
                router.replace("/admin/dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminChangePassword.genericError"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } finally {
            router.replace("/admin/login");
        }
    };

    if (loading || !isAuthenticated || !mustChangePassword) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <Image
                    src="/assets/priconpri/logo-horizontal-pink-outline.webp"
                    alt="PriConPri"
                    width={600}
                    height={370}
                    className="mx-auto mb-6 h-8 w-auto"
                    priority
                />
                <Card className="border-white/10 bg-white/5 text-white shadow-lg backdrop-blur">
                    <CardHeader>
                        <CardTitle>{t("adminChangePassword.title")}</CardTitle>
                        <CardDescription className="text-white/70">
                            {t("adminChangePassword.subtitle")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="current-password" className="text-white">
                                    {t("adminChangePassword.currentPassword")}
                                </Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    className="bg-white/10 text-white placeholder:text-white/60 border-white/20 caret-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password" className="text-white">
                                    {t("adminChangePassword.newPassword")}
                                </Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="bg-white/10 text-white placeholder:text-white/60 border-white/20 caret-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-white">
                                    {t("adminChangePassword.confirmPassword")}
                                </Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="bg-white/10 text-white placeholder:text-white/60 border-white/20 caret-white"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
                                className="w-full bg-brand text-white hover:bg-brand-hover"
                            >
                                {submitting ? t("adminChangePassword.updating") : t("adminChangePassword.updateButton")}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-white/20 text-white bg-transparent hover:bg-white/10"
                                onClick={handleSignOut}
                            >
                                {t("adminChangePassword.signOut")}
                            </Button>

                            {(status || error) && (
                                <div
                                    className={cn(
                                        "w-full rounded-lg border px-3 py-2 text-sm",
                                        status
                                            ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                                            : "border-rose-400/50 bg-rose-500/10 text-rose-100",
                                    )}
                                >
                                    {status || error}
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
