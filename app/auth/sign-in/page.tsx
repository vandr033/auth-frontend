"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail, sendPhoneOtp, verifyPhoneOtp, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("1");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phoneNumber = useMemo(
    () => toPhoneNumber(phonePrefix, phone),
    [phonePrefix, phone],
  );

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    try {
      await signInWithEmail(email, password);
      setStatus("Signed in successfully. Redirecting...");
      router.push("/barber-shop");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
    }
  };

  const handleSendOtp = async () => {
    setError(null);
    setStatus(null);
    try {
      await sendPhoneOtp(phoneNumber);
      setOtpSent(true);
      setStatus("OTP sent. Check your WhatsApp or SMS.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send OTP";
      setError(message);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setStatus(null);
    try {
      await verifyPhoneOtp(phoneNumber, otpCode);
      setStatus("Phone verified. Redirecting...");
      router.push("/barber-shop");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to verify code";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8 lg:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Welcome back
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Sign in</h1>
            <p className="text-white/70">
              Access your appointments or create a new account in minutes.
            </p>
          </div>
          <Link href="/auth/register">
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:border-white hover:text-white"
            >
              New here? Create an account
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader className="pb-2">
              <CardTitle>Email & password</CardTitle>
              <CardDescription className="text-white/70">
                Sign in with your email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleEmailSubmit}>
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
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 text-white placeholder:text-white/60"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
                <div className="flex items-center justify-between text-sm text-white/70">
                  <Link href="/auth/forgot-password" className="hover:text-white">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader className="pb-2">
              <CardTitle>Phone number</CardTitle>
              <CardDescription className="text-white/70">
                Receive a one-time code to sign in securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {!otpSent ? (
                <Button
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  onClick={handleSendOtp}
                  disabled={loading || !phone}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-white">
                      Verification code
                    </Label>
                    <Input
                      id="otp"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <Button
                    className="w-full bg-brand text-white hover:bg-brand-hover"
                    onClick={handleVerifyOtp}
                    disabled={loading || !otpCode}
                  >
                    {loading ? "Verifying..." : "Verify & continue"}
                  </Button>
                </div>
              )}
              <p className="text-xs text-white/60">
                We will format your phone as: <strong>{phoneNumber}</strong>
              </p>
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
      </div>
    </div>
  );
}
