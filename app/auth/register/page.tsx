"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { PhoneInput } from "@/components/ui/phone-input";
import { Mail, Phone, ArrowLeft, Loader2, UserPlus, Sparkles } from "lucide-react";

type Method = null | "email" | "phone";
type FlowStep = "method" | "contact" | "otp" | "profile" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const {
    startCustomerEmailRegistration,
    verifyCustomerEmailCode,
    completeCustomerEmailRegistration,
    sendPhoneOtp,
    verifyPhoneOtp,
    completeCustomerPhoneProfile,
  } = useAuth();

  const [method, setMethod] = useState<Method>(null);
  const [step, setStep] = useState<FlowStep>("method");

  // Email state
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [preRegToken, setPreRegToken] = useState("");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Profile state (shared)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSelectMethod = (m: Method) => {
    setMethod(m);
    setStep("contact");
    setLocalError(null);
  };

  const handleBack = () => {
    if (step === "contact") {
      setMethod(null);
      setStep("method");
      setEmail("");
      setPhoneNumber("");
      setDialCode("");
    } else if (step === "otp") {
      setStep("contact");
      setEmailCode("");
      setOtpCode("");
    } else if (step === "profile") {
      // Can't go back from profile (already verified)
      return;
    }
    setLocalError(null);
  };

  // ── Email flow ──
  const handleEmailSend = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await startCustomerEmailRegistration(email);
      setStep("otp");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Unable to send code");
    } finally {
      setSending(false);
    }
  };

  const handleEmailVerify = async () => {
    setSending(true);
    setLocalError(null);
    try {
      const { preRegToken: token } = await verifyCustomerEmailCode(email, emailCode);
      setPreRegToken(token);
      setStep("profile");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setSending(false);
    }
  };

  const handleEmailComplete = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await completeCustomerEmailRegistration(preRegToken, email, firstName, lastName);
      setStep("done");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSending(false);
    }
  };

  // ── Phone flow ──
  const handlePhoneSend = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await sendPhoneOtp(phoneNumber);
      setStep("otp");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Unable to send OTP");
    } finally {
      setSending(false);
    }
  };

  const handlePhoneVerify = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await verifyPhoneOtp(phoneNumber, otpCode);
      setStep("profile");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setSending(false);
    }
  };

  const handlePhoneComplete = async () => {
    setSending(true);
    setLocalError(null);
    try {
      // Extract prefix digits from dialCode (e.g. "+961" → "961")
      const prefix = dialCode.replace("+", "");
      await completeCustomerPhoneProfile(firstName, lastName, prefix);
      setStep("done");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSending(false);
    }
  };

  // ── Method Selection ──
  if (step === "method") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Sparkles className="h-7 w-7 text-brand" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Choose how you&apos;d like to register — no password needed
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSelectMethod("email")}
              className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand/30 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Register with Email</p>
                <p className="text-sm text-slate-500">
                  We&apos;ll verify your email with a code
                </p>
              </div>
            </button>

            <button
              onClick={() => handleSelectMethod("phone")}
              className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand/30 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Register with Phone</p>
                <p className="text-sm text-slate-500">
                  We&apos;ll send a code via WhatsApp
                </p>
              </div>
            </button>
          </div>

          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="font-medium text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <UserPlus className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Account created!</h1>
          <p className="text-sm text-slate-500">You&apos;re being redirected...</p>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  // ── Fullscreen flow screens ──
  const getTitle = () => {
    if (step === "contact") {
      return method === "email" ? "Enter your email" : "Enter your phone number";
    }
    if (step === "otp") return "Enter verification code";
    if (step === "profile") return "Complete your profile";
    return "";
  };

  const getSubtitle = () => {
    if (step === "contact") {
      return method === "email"
        ? "We'll send you a one-time verification code"
        : "We'll send you a code via WhatsApp";
    }
    if (step === "otp") {
      return `We sent a code to ${method === "email" ? email : phoneNumber}`;
    }
    if (step === "profile") return "Just a couple more details to get started";
    return "";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Back button */}
        {step !== "profile" && (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
            <UserPlus className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{getTitle()}</h1>
          <p className="mt-2 text-sm text-slate-500">{getSubtitle()}</p>
        </div>

        <div className="space-y-4">
          {/* Contact input step */}
          {step === "contact" && (
            <>
              {method === "email" ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              ) : (
                <PhoneInput
                  value={phoneNumber}
                  onChange={(full, dial) => {
                    setPhoneNumber(full);
                    setDialCode(dial);
                  }}
                />
              )}

              <button
                onClick={method === "email" ? handleEmailSend : handlePhoneSend}
                disabled={sending || (method === "email" ? !email : !phoneNumber)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send code
              </button>
            </>
          )}

          {/* OTP verification step */}
          {step === "otp" && (
            <>
              <input
                type="text"
                inputMode="numeric"
                value={method === "email" ? emailCode : otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  method === "email" ? setEmailCode(val) : setOtpCode(val);
                }}
                placeholder="123456"
                maxLength={6}
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />

              <button
                onClick={method === "email" ? handleEmailVerify : handlePhoneVerify}
                disabled={sending || (method === "email" ? emailCode.length < 4 : otpCode.length < 4)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify code
              </button>

              <button
                onClick={() => { setStep("contact"); method === "email" ? setEmailCode("") : setOtpCode(""); }}
                className="w-full text-center text-sm text-slate-500 hover:text-brand"
              >
                Didn&apos;t receive a code? Resend
              </button>
            </>
          )}

          {/* Profile completion step */}
          {step === "profile" && (
            <>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />

              <button
                onClick={method === "email" ? handleEmailComplete : handlePhoneComplete}
                disabled={sending || !firstName}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete registration
              </button>
            </>
          )}

          {localError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {localError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
