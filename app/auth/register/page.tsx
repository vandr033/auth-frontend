"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useT } from "@/lib/i18n";
import { PhoneInput } from "@/components/ui/phone-input";
import { Mail, Phone, ArrowLeft, Loader2, UserPlus, Sparkles } from "lucide-react";
import { useOtpResendTimer } from "@/lib/auth/otpResend";
import { sanitizeInternalRedirectTarget } from "@/app/lib/shop-context";

type Method = null | "email" | "phone";
type FlowStep = "method" | "contact" | "otp" | "profile" | "done";

function RegisterPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = React.useMemo(() => {
    return sanitizeInternalRedirectTarget(searchParams?.get("redirect") ?? null, "/");
  }, [searchParams]);
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
  const [hasRequestedOtp, setHasRequestedOtp] = useState(false);

  // Profile state (shared)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { secondsRemaining, canResend, startCooldown } = useOtpResendTimer();

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
      setHasRequestedOtp(true);
      startCooldown();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.register.sendCodeError"));
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
      setLocalError(err instanceof Error ? err.message : t("auth.register.invalidCode"));
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
      setTimeout(() => router.push(redirect), 1500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.register.registrationFailed"));
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
      setHasRequestedOtp(true);
      startCooldown();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.register.sendOtpError"));
    } finally {
      setSending(false);
    }
  };

  const handleResendCode = async () => {
    if (!method || !canResend || sending) return;

    if (method === "email") {
      await handleEmailSend();
      return;
    }

    await handlePhoneSend();
  };

  const handlePhoneVerify = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await verifyPhoneOtp(phoneNumber, otpCode);
      setStep("profile");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.register.invalidOtp"));
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
      setTimeout(() => router.push(redirect), 1500);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.register.registrationFailed"));
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
            <h1 className="text-2xl font-bold text-slate-900">{t("auth.register.title")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("auth.register.subtitle")}
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
                <p className="font-semibold text-slate-900">{t("auth.register.emailOptionTitle")}</p>
                <p className="text-sm text-slate-500">
                  {t("auth.register.emailOptionDesc")}
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
                <p className="font-semibold text-slate-900">{t("auth.register.phoneOptionTitle")}</p>
                <p className="text-sm text-slate-500">
                  {t("auth.register.phoneOptionDesc")}
                </p>
              </div>
            </button>
          </div>

          <p className="text-sm text-slate-400">
            {t("auth.register.alreadyHaveAccount")}{" "}
            <Link href={redirect !== "/" ? `/auth/sign-in?redirect=${encodeURIComponent(redirect)}` : "/auth/sign-in"} className="font-medium text-brand hover:underline">
              {t("auth.register.signIn")}
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
          <h1 className="text-2xl font-bold text-slate-900">{t("auth.register.accountCreated")}</h1>
          <p className="text-sm text-slate-500">{t("auth.register.redirecting")}</p>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  // ── Fullscreen flow screens ──
  const getTitle = () => {
    if (step === "contact") {
      return method === "email" ? t("auth.register.enterYourEmail") : t("auth.register.enterYourPhone");
    }
    if (step === "otp") return t("auth.register.enterVerificationCode");
    if (step === "profile") return t("auth.register.completeProfile");
    return "";
  };

  const getSubtitle = () => {
    if (step === "contact") {
      return method === "email"
        ? t("auth.register.emailCodeHint")
        : t("auth.register.phoneCodeHint");
    }
    if (step === "otp") {
      return t("auth.register.sentCodeTo", { target: method === "email" ? email : phoneNumber });
    }
    if (step === "profile") return t("auth.register.profileHint");
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
            {t("auth.register.back")}
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
                  placeholder={t("auth.register.emailPlaceholder")}
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
                disabled={
                  sending ||
                  (method === "email" ? !email : !phoneNumber) ||
                  (hasRequestedOtp && !canResend)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.register.sendCode")}
              </button>
              {hasRequestedOtp && !canResend && (
                <p className="text-center text-xs text-slate-500" aria-live="polite">
                  {t("auth.register.resendIn", { seconds: secondsRemaining })}
                </p>
              )}
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
                  if (method === "email") {
                    setEmailCode(val);
                  } else {
                    setOtpCode(val);
                  }
                }}
                placeholder={t("auth.register.codePlaceholder")}
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
                {t("auth.register.verifyCode")}
              </button>

              <p className="text-center text-xs text-slate-500" aria-live="polite">
                {canResend
                  ? t("auth.register.resendReady")
                  : t("auth.register.resendIn", { seconds: secondsRemaining })}
              </p>
              <button
                onClick={() => void handleResendCode()}
                disabled={sending || !canResend}
                className="w-full text-center text-sm text-slate-500 hover:text-brand disabled:opacity-50 disabled:hover:text-slate-500"
              >
                {t("auth.register.resendCode")}
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
                placeholder={t("auth.register.firstNamePlaceholder")}
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("auth.register.lastNamePlaceholder")}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />

              <button
                onClick={method === "email" ? handleEmailComplete : handlePhoneComplete}
                disabled={sending || !firstName || !lastName}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.register.completeRegistration")}
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

export default function RegisterPage() {
  return (
    <React.Suspense>
      <RegisterPageInner />
    </React.Suspense>
  );
}
