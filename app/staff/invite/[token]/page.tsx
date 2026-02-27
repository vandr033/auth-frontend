"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const resolveUrl = (path: string) => {
    const base = API_BASE_URL.endsWith("/api")
        ? API_BASE_URL.replace(/\/api$/, "")
        : API_BASE_URL;
    return `${base}${path}`;
};

interface InviteInfo {
    display_name: string;
    company_name: string;
    email: string;
}

export default function StaffInvitePage() {
    const t = useT();
    const { token } = useParams<{ token: string }>();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Fetch invite info
    useEffect(() => {
        fetch(resolveUrl(`/api/staff/invite-info/${token}`))
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(data?.error || t("staffInvite.invalidInviteError"));
                }
                return res.json();
            })
            .then((data) => setInviteInfo(data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [token, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (code.length !== 6) {
            setFormError(t("staffInvite.codeRequiredError"));
            return;
        }

        if (password.length < 6) {
            setFormError(t("staffInvite.passwordMinError"));
            return;
        }

        if (password !== confirmPassword) {
            setFormError(t("staffInvite.passwordsMismatchError"));
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch(resolveUrl("/api/staff/accept-invite"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, code, password }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || t("staffInvite.acceptInviteError"));
            }

            setSuccess(true);

            // Redirect to admin login after 3 seconds
            setTimeout(() => {
                router.push("/admin/login");
            }, 3000);
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">{t("staffInvite.invalidInvitation")}</h2>
                        <p className="text-sm text-slate-600">{error}</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => router.push("/admin/login")}
                        >
                            {t("staffInvite.goToSignIn")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">{t("staffInvite.welcomeAboard")}</h2>
                        <p className="text-sm text-slate-600">
                            {t("staffInvite.setupCompleteRedirect")}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("staffInvite.joinCompany", { company: inviteInfo?.company_name || "" })}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        {t("staffInvite.welcomeUser", { name: inviteInfo?.display_name || "" })}
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email (read-only) */}
                        <div>
                            <Label htmlFor="email">{t("staffInvite.email")}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={inviteInfo?.email || ""}
                                disabled
                                className="bg-slate-50"
                            />
                        </div>

                        {/* Verification Code */}
                        <div>
                            <Label htmlFor="code">{t("staffInvite.verificationCode")}</Label>
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder={t("staffInvite.verificationCodePlaceholder")}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                className="text-center text-lg tracking-widest font-mono"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <Label htmlFor="password">{t("staffInvite.createPassword")}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder={t("staffInvite.passwordPlaceholder")}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <Label htmlFor="confirm-password">{t("staffInvite.confirmPassword")}</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder={t("staffInvite.confirmPasswordPlaceholder")}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700">
                                {formError}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {t("staffInvite.acceptInvitation")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
