"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ResetStep = "email" | "verify";

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

export default function AdminResetPasswordPage() {
    const t = useT();
    const router = useRouter();
    const { isAuthenticated, loading, user, mustChangePassword } = useAdminAuth();

    const [step, setStep] = useState<ResetStep>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (loading || !isAuthenticated) return;

        if (mustChangePassword) {
            router.replace("/admin/change-password");
            return;
        }

        if (user?.is_super_admin) {
            router.replace("/admin/super-admin");
            return;
        }

        router.replace("/admin/dashboard");
    }, [loading, isAuthenticated, mustChangePassword, user?.is_super_admin, router]);

    const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setStatus(null);

        if (!email.trim()) {
            setError(t("adminResetPassword.emailRequired"));
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl("/api/admin/auth/password-reset/start"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, response.status, t("adminResetPassword.startError")));
            }

            setStep("verify");
            setStatus(t("adminResetPassword.codeSent"));
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminResetPassword.startError"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setStatus(null);

        if (newPassword.length < 8) {
            setError(t("adminResetPassword.newPasswordMin"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t("adminResetPassword.mismatch"));
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl("/api/admin/auth/password-reset/complete"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code: code.trim(),
                    newPassword,
                    confirmPassword,
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, response.status, t("adminResetPassword.completeError")));
            }

            setStatus(t("adminResetPassword.passwordUpdated"));
            setTimeout(() => {
                router.replace("/admin/login");
            }, 1200);
        } catch (err) {
            setError(err instanceof Error ? err.message : t("adminResetPassword.completeError"));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">{t("adminResetPassword.title")}</h1>
                    <p className="text-white/70 mt-2">{t("adminResetPassword.subtitle")}</p>
                </div>

                <Card className="border-white/10 bg-white/5 text-white shadow-lg backdrop-blur">
                    <CardHeader>
                        <CardTitle>{t("adminResetPassword.cardTitle")}</CardTitle>
                        <CardDescription className="text-white/70">
                            {step === "email"
                                ? t("adminResetPassword.emailStepDescription")
                                : t("adminResetPassword.verifyStepDescription")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === "email" ? (
                            <form className="space-y-4" onSubmit={handleSendCode}>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-white">{t("adminResetPassword.email")}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t("adminResetPassword.emailPlaceholder")}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-brand text-white hover:bg-brand-hover" disabled={submitting}>
                                    {submitting ? t("adminResetPassword.sendingCode") : t("adminResetPassword.sendCode")}
                                </Button>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleResetPassword}>
                                <div className="space-y-2">
                                    <Label htmlFor="verification-code" className="text-white">{t("adminResetPassword.verificationCode")}</Label>
                                    <Input
                                        id="verification-code"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder={t("adminResetPassword.codePlaceholder")}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new-password" className="text-white">{t("adminResetPassword.newPassword")}</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password" className="text-white">{t("adminResetPassword.confirmPassword")}</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-brand text-white hover:bg-brand-hover"
                                    disabled={submitting || !code || !newPassword || !confirmPassword}
                                >
                                    {submitting ? t("adminResetPassword.updatingPassword") : t("adminResetPassword.updatePassword")}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-white/20 text-white bg-transparent hover:bg-white/10"
                                    onClick={() => {
                                        setStep("email");
                                        setCode("");
                                        setNewPassword("");
                                        setConfirmPassword("");
                                        setStatus(null);
                                        setError(null);
                                    }}
                                >
                                    {t("adminResetPassword.changeEmail")}
                                </Button>
                            </form>
                        )}

                        {(status || error) && (
                            <div
                                className={cn(
                                    "w-full rounded-lg border px-3 py-2 text-sm mt-4",
                                    status
                                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                                        : "border-rose-400/50 bg-rose-500/10 text-rose-100",
                                )}
                            >
                                {status || error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-6 text-center text-sm text-white/60">
                    <Link href="/admin/login" className="hover:text-white">
                        {`← ${t("adminResetPassword.backToLogin")}`}
                    </Link>
                </div>
            </div>
        </div>
    );
}
