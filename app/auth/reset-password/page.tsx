"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const { resetPassword, loading } = useAuth();

  const [emailToken, setEmailToken] = useState(tokenFromUrl);
  const [newEmailPassword, setNewEmailPassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const handleEmailReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await resetPassword(emailToken, newEmailPassword);
      setStatus(t("auth.resetPassword.success"));
      setTimeout(() => router.push("/auth/sign-in"), 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.resetPassword.resetError");
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            {t("auth.resetPassword.eyebrow")}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t("auth.resetPassword.title")}</h1>
          <p className="text-white/70">
            {t("auth.resetPassword.subtitle")}
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 text-white shadow-card">
          <CardHeader>
            <CardTitle>{t("auth.resetPassword.cardTitle")}</CardTitle>
            <CardDescription className="text-white/70">
              {t("auth.resetPassword.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleEmailReset}>
              <div className="space-y-2">
                <Label htmlFor="token" className="text-white">
                  {t("auth.resetPassword.token")}
                </Label>
                <Input
                  id="token"
                  value={emailToken}
                  onChange={(e) => setEmailToken(e.target.value)}
                  placeholder={t("auth.resetPassword.tokenPlaceholder")}
                  className="bg-white/10 text-white placeholder:text-white/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white">
                  {t("auth.resetPassword.newPassword")}
                </Label>
                <Input
                  id="newPassword"
                  type={showEmailPassword ? "text" : "password"}
                  value={newEmailPassword}
                  onChange={(e) => setNewEmailPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/10 text-white placeholder:text-white/60"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showEmailPassword ? t("auth.resetPassword.hidePassword") : t("auth.resetPassword.showPassword")}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-brand text-white hover:bg-brand-hover"
                disabled={loading || !emailToken || !newEmailPassword}
              >
                {loading ? t("auth.resetPassword.saving") : t("auth.resetPassword.resetButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {(status || error) && (
          <div
            className={cn(
              "w-full rounded-lg border px-4 py-3 text-sm",
              status
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/50 bg-rose-500/10 text-rose-100",
            )}
          >
            {status || error}
          </div>
        )}

        <div className="text-sm text-white/80">
          {t("auth.resetPassword.remembered")}{" "}
          <Link href="/auth/sign-in" className="font-semibold text-white">
            {t("auth.resetPassword.backToSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
