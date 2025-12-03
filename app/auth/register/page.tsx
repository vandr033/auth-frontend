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

type EmailStep = "start" | "verify" | "complete";
type PhoneStep = "start" | "verify" | "complete";

export default function RegisterPage() {
  const router = useRouter();
  const {
    startCustomerEmailRegistration,
    verifyCustomerEmailCode,
    completeCustomerEmailRegistration,
    sendPhoneOtp,
    verifyPhoneOtp,
    completeCustomerPhoneProfile,
    loading,
  } = useAuth();

  const [activeFlow, setActiveFlow] = useState<"email" | "phone">("email");

  const [emailStep, setEmailStep] = useState<EmailStep>("start");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [preRegToken, setPreRegToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [phonePrefix, setPhonePrefix] = useState("1");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneFirstName, setPhoneFirstName] = useState("");
  const [phoneLastName, setPhoneLastName] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("start");
  const [phoneStatus, setPhoneStatus] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const phoneNumber = useMemo(
    () => toPhoneNumber(phonePrefix, phone),
    [phonePrefix, phone],
  );

  const handleStartEmail = async () => {
    setEmailError(null);
    setEmailStatus(null);
    try {
      await startCustomerEmailRegistration(email);
      setEmailStep("verify");
      setEmailStatus("We sent a code to your email.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start verification";
      setEmailError(message);
    }
  };

  const handleVerifyEmail = async () => {
    setEmailError(null);
    setEmailStatus(null);
    try {
      const data = await verifyCustomerEmailCode(email, emailCode);
      setPreRegToken(data.preRegToken);
      setEmailStep("complete");
      setEmailStatus("Email verified. Complete your profile to finish.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to verify code";
      setEmailError(message);
    }
  };

  const handleCompleteEmail = async () => {
    setEmailError(null);
    setEmailStatus(null);
    try {
      await completeCustomerEmailRegistration(
        preRegToken,
        email,
        password,
        firstName,
        lastName,
      );
      setEmailStatus("Account created. Redirecting...");
      router.push("/barber-shop");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create account";
      setEmailError(message);
    }
  };

  const handleSendPhoneOtp = async () => {
    setPhoneError(null);
    setPhoneStatus(null);
    try {
      await sendPhoneOtp(phoneNumber);
      setPhoneStep("verify");
      setPhoneStatus("OTP sent. Check your WhatsApp or SMS.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to send OTP";
      setPhoneError(message);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setPhoneError(null);
    setPhoneStatus(null);
    try {
      await verifyPhoneOtp(phoneNumber, phoneCode);
      setPhoneStep("complete");
      setPhoneStatus("Phone verified. Complete your profile.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to verify code";
      setPhoneError(message);
    }
  };

  const handleCompletePhoneProfile = async () => {
    setPhoneError(null);
    setPhoneStatus(null);
    try {
      await completeCustomerPhoneProfile(
        phoneFirstName,
        phoneLastName,
        phonePrefix,
      );
      setPhoneStatus("Profile completed. Redirecting...");
      router.push("/barber-shop");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to complete profile";
      setPhoneError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Create account
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Become a customer
            </h1>
            <p className="text-white/70">
              Register with email or phone. We will guide you through verification.
            </p>
          </div>
          <Link href="/auth/sign-in">
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:border-white hover:text-white"
            >
              Already have an account? Sign in
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          {(["email", "phone"] as const).map((flow) => (
            <button
              key={flow}
              onClick={() => setActiveFlow(flow)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                activeFlow === flow
                  ? "bg-white text-slate-900"
                  : "border border-white/20 text-white hover:border-white/50",
              )}
              type="button"
            >
              {flow === "email" ? "Email registration" : "Phone registration"}
            </button>
          ))}
        </div>

        {activeFlow === "email" ? (
          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader>
              <CardTitle>Email-based registration</CardTitle>
              <CardDescription className="text-white/70">
                Verify your email, then finish your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                {emailStep !== "start" && (
                  <div className="space-y-2">
                    <Label htmlFor="emailCode" className="text-white">
                      Verification code
                    </Label>
                    <Input
                      id="emailCode"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      placeholder="123456"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                )}
              </div>

              {emailStep === "start" && (
                <Button
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  onClick={handleStartEmail}
                  disabled={loading || !email}
                >
                  {loading ? "Sending code..." : "Send verification code"}
                </Button>
              )}

              {emailStep === "verify" && (
                <Button
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  onClick={handleVerifyEmail}
                  disabled={loading || !emailCode}
                >
                  {loading ? "Verifying..." : "Verify code"}
                </Button>
              )}

              {emailStep === "complete" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-white">
                      preRegToken
                    </Label>
                    <Input
                      id="token"
                      value={preRegToken}
                      onChange={(e) => setPreRegToken(e.target.value)}
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      className="w-full bg-brand text-white hover:bg-brand-hover"
                      onClick={handleCompleteEmail}
                      disabled={
                        loading ||
                        !firstName ||
                        !password ||
                        preRegToken.length === 0
                      }
                    >
                      {loading ? "Creating account..." : "Complete registration"}
                    </Button>
                  </div>
                </div>
              )}

              {(emailStatus || emailError) && (
                <div
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm",
                    emailStatus
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-400/50 bg-rose-500/10 text-rose-100",
                  )}
                >
                  {emailStatus || emailError}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/10 bg-white/5 text-white shadow-card">
            <CardHeader>
              <CardTitle>Phone-based registration</CardTitle>
              <CardDescription className="text-white/70">
                Verify your phone with OTP and finish your profile.
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

              {phoneStep === "start" && (
                <Button
                  className="w-full bg-brand text-white hover:bg-brand-hover"
                  onClick={handleSendPhoneOtp}
                  disabled={loading || !phone}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
              )}

              {phoneStep === "verify" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="phoneCode" className="text-white">
                      Verification code
                    </Label>
                    <Input
                      id="phoneCode"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      placeholder="123456"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <Button
                    className="w-full bg-brand text-white hover:bg-brand-hover"
                    onClick={handleVerifyPhoneOtp}
                    disabled={loading || !phoneCode}
                  >
                    {loading ? "Verifying..." : "Verify code"}
                  </Button>
                </div>
              )}

              {phoneStep === "complete" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phoneFirstName" className="text-white">
                      First name
                    </Label>
                    <Input
                      id="phoneFirstName"
                      value={phoneFirstName}
                      onChange={(e) => setPhoneFirstName(e.target.value)}
                      placeholder="Jane"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneLastName" className="text-white">
                      Last name
                    </Label>
                    <Input
                      id="phoneLastName"
                      value={phoneLastName}
                      onChange={(e) => setPhoneLastName(e.target.value)}
                      placeholder="Doe"
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phonePrefixConfirm" className="text-white">
                      Phone prefix (optional)
                    </Label>
                    <Input
                      id="phonePrefixConfirm"
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="bg-white/10 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      className="w-full bg-brand text-white hover:bg-brand-hover"
                      onClick={handleCompletePhoneProfile}
                      disabled={loading || !phoneFirstName}
                    >
                      {loading ? "Saving profile..." : "Complete profile"}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-white/60">
                We will format your phone as: <strong>{phoneNumber}</strong>
              </p>

              {(phoneStatus || phoneError) && (
                <div
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm",
                    phoneStatus
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-400/50 bg-rose-500/10 text-rose-100",
                  )}
                >
                  {phoneStatus || phoneError}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
