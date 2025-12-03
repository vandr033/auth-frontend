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
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

const toPhoneNumber = (prefix: string, phone: string) =>
  `+${prefix.replace(/\D/g, "")}${phone.replace(/\D/g, "")}`;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const { resetPassword, resetPhonePassword, loading } = useAuth();

  const [emailToken, setEmailToken] = useState(tokenFromUrl);
  const [newEmailPassword, setNewEmailPassword] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("1");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [newPhonePassword, setNewPhonePassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await resetPassword(emailToken, newEmailPassword);
      setStatus("Password updated. Redirecting to sign in...");
      setTimeout(() => router.push("/auth/sign-in"), 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to reset password";
      setError(message);
    }
  };

  const handlePhoneReset = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await resetPhonePassword(
        toPhoneNumber(phonePrefix, phone),
        phoneCode,
        newPhonePassword,
      );
      setStatus("Password updated. Redirecting to sign in...");
      setTimeout(() => router.push("/auth/sign-in"), 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to reset password";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Reset password
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Choose a new password</h1>
          <p className="text-white/70">
            You can reset via your email token or verify with your phone.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader>
              <CardTitle>Email reset</CardTitle>
              <CardDescription className="text-white/70">
                Paste the token from your email and choose a new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleEmailReset}>
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-white">
                    Token
                  </Label>
                  <Input
                    id="token"
                    value={emailToken}
                    onChange={(e) => setEmailToken(e.target.value)}
                    placeholder="Reset token"
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-white">
                    New password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newEmailPassword}
                    onChange={(e) => setNewEmailPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  disabled={loading || !emailToken || !newEmailPassword}
                >
                  {loading ? "Saving..." : "Reset password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader>
              <CardTitle>Phone reset</CardTitle>
              <CardDescription className="text-white/70">
                Verify a code sent to your phone, then set a new password.
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
                <div className="space-y-2">
                  <Label htmlFor="phoneCode" className="text-white">
                    Code
                  </Label>
                  <Input
                    id="phoneCode"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="123456"
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phonePassword" className="text-white">
                    New password
                  </Label>
                  <Input
                    id="phonePassword"
                    type="password"
                    value={newPhonePassword}
                    onChange={(e) => setNewPhonePassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <p className="text-xs text-white/60">
                  Phone formatted as: <strong>{toPhoneNumber(phonePrefix, phone)}</strong>
                </p>
                <Button
                  type="submit"
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  disabled={
                    loading || !phone || !phoneCode || !newPhonePassword
                  }
                >
                  {loading ? "Saving..." : "Reset password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

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
