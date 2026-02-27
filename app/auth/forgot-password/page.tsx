"use client";

import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const t = useT();
  const { requestPasswordReset, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await requestPasswordReset(email);
      setStatus(t("auth.forgotPassword.success"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.forgotPassword.requestError");
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            {t("auth.forgotPassword.eyebrow")}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t("auth.forgotPassword.title")}</h1>
          <p className="text-white/70">
            {t("auth.forgotPassword.subtitle")}
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 text-white shadow-card">
          <CardHeader>
            <CardTitle>{t("auth.forgotPassword.cardTitle")}</CardTitle>
            <CardDescription className="text-white/70">
              {t("auth.forgotPassword.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleEmailReset}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  {t("auth.forgotPassword.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
                  className="bg-white/10 text-white placeholder:text-white/60"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-brand text-white hover:bg-brand-hover"
                disabled={loading || !email}
              >
                {loading ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendResetLink")}
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
          {t("auth.forgotPassword.remembered")}{" "}
          <Link href="/auth/sign-in" className="font-semibold text-white">
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
