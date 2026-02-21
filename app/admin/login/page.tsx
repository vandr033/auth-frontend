"use client";

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
import { cn } from "@/lib/utils";
import { useAdminAuth } from "../contexts/AdminAuthContext";

export default function AdminLoginPage() {
    const router = useRouter();
    const { signIn, loading, isSuperAdmin, companyUser } = useAdminAuth();

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
            const { user: signedInUser, companyUser: signedInCompanyUser } = await signIn(email, password);
            setStatus("Signed in successfully. Redirecting...");
            // Super admin without a shop goes to super admin panel
            // Otherwise go to regular admin dashboard
            if (signedInUser.is_super_admin && !signedInCompanyUser) {
                router.replace("/admin/super-admin");
            } else {
                router.replace("/admin/dashboard");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to sign in";
            setError(message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Admin Login</h1>
                    <p className="text-white/70 mt-2">
                        Sign in to manage your salon
                    </p>
                </div>

                <Card className="border-white/10 bg-white/5 text-white shadow-lg backdrop-blur">
                    <CardHeader>
                        <CardTitle>Welcome back</CardTitle>
                        <CardDescription className="text-white/70">
                            Enter your credentials to access the dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white/10 text-white placeholder:text-white/60 border-white/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">
                                    Password
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
                                        {showPassword ? "Hide password" : "Show password"}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-brand text-white hover:bg-brand-hover"
                                disabled={loading || !email || !password}
                            >
                                {loading ? "Signing in..." : "Sign in"}
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
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
