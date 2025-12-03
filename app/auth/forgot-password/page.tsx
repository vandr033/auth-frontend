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
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

const toPhoneNumber = (prefix: string, phone: string) =>
  `+${prefix.replace(/\D/g, "")}${phone.replace(/\D/g, "")}`;

export default function ForgotPasswordPage() {
  const { requestPasswordReset, requestPhonePasswordReset, loading } = useAuth();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("1");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await requestPasswordReset(email);
      setStatus("If this email exists, we sent a reset link.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to request reset";
      setError(message);
    }
  };

  const handlePhoneReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await requestPhonePasswordReset(toPhoneNumber(phonePrefix, phone));
      setStatus("If this phone exists, we sent reset instructions.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to request reset";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Reset password
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Forgot password</h1>
          <p className="text-white/70">
            Choose how you want to reset your password. We will never reveal whether an account exists.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {(["email", "phone"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMethod(option)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                method === option
                  ? "bg-white text-slate-900"
                  : "border border-white/20 text-white hover:border-white/50",
              )}
            >
              {option === "email" ? "Email reset" : "Phone reset"}
            </button>
          ))}
        </div>

        {method === "email" ? (
          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader>
              <CardTitle>Email reset</CardTitle>
              <CardDescription className="text-white/70">
                We will email you a reset link if the account exists.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleEmailReset}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  disabled={loading || !email}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader>
              <CardTitle>Phone reset</CardTitle>
              <CardDescription className="text-white/70">
                We will send reset instructions to your phone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePhoneReset}>
                <div className="grid grid-cols-[0.9fr_2fr] gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="phonePrefix" className="text-white">
                      Prefix
                    </Label>
                    <Input
                      id="phonePrefix"
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="71234567"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
                <p className="text-xs text-white/60">
                  We will format your phone as:{" "}
                  <strong>{toPhoneNumber(phonePrefix, phone)}</strong>
                </p>
                <Button
                  type="submit"
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  disabled={loading || !phone}
                >
                  {loading ? "Sending..." : "Send reset instructions"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

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
          Remembered your password?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-white">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
