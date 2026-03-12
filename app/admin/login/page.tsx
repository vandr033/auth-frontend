"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "../contexts/AdminAuthContext";

export default function AdminLoginPage() {
    const t = useT();
    const router = useRouter();
    const { signIn, loading } = useAdminAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setStatus(null);

        try {
            const { user: signedInUser } = await signIn(email, password);
            setStatus(t("adminLogin.success"));
            if (signedInUser.must_change_password) {
                router.replace("/admin/change-password");
                return;
            }
            // Super admins always land in the super admin panel.
            if (signedInUser.is_super_admin) {
                router.replace("/admin/super-admin");
            } else {
                // Regular admin/staff users go to the company dashboard.
                router.replace("/admin/dashboard");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : t("adminLogin.signInError");
            setError(message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Image
                        src="/assets/priconpri/logo-horizontal-pink-outline.png"
                        alt="PriConPri"
                        width={600}
                        height={370}
                        className="mx-auto mb-4 h-8 w-auto"
                        priority
                    />
                    <h1 className="text-3xl font-bold text-white">{t("adminLogin.title")}</h1>
                    <p className="text-white/70 mt-2">
                        {t("adminLogin.subtitle")}
                    </p>
                </div>

                <Card className="border-white/10 bg-white/5 text-white shadow-lg backdrop-blur">
                    <CardHeader>
                        <CardTitle>{t("adminLogin.cardTitle")}</CardTitle>
                        <CardDescription className="text-white/70">
                            {t("adminLogin.cardDescription")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">
                                    {t("adminLogin.email")}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("adminLogin.emailPlaceholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">
                                    {t("adminLogin.password")}
                                </Label>
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        {showPassword ? t("adminLogin.hidePassword") : t("adminLogin.showPassword")}
                                    </button>
                                    <Link
                                        href="/admin/reset-password"
                                        className="ml-auto text-sm text-white/70 hover:text-white transition-colors"
                                    >
                                        {t("adminLogin.forgotPassword")}
                                    </Link>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-brand text-white hover:bg-brand-hover"
                                disabled={loading || !email || !password}
                            >
                                {loading ? t("adminLogin.signingIn") : t("adminLogin.signIn")}
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

                <div className="mt-6 text-center text-sm text-white/60">
                    <Link href="/" className="hover:text-white">
                        {`← ${t("adminLogin.backToHome")}`}
                    </Link>
                </div>
            </div>
        </div>
    );
}
