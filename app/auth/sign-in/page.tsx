"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useT } from "@/lib/i18n";
import { PhoneInput } from "@/components/ui/phone-input";
import { Mail, Phone, ArrowLeft, Loader2, KeyRound, Sparkles } from "lucide-react";
import { useOtpResendTimer } from "@/lib/auth/otpResend";
import { sanitizeInternalRedirectTarget } from "@/app/lib/shop-context";

type Method = null | "email" | "phone";
type Step = "method" | "otp";

function SignInPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = React.useMemo(() => {
    return sanitizeInternalRedirectTarget(searchParams?.get("redirect") ?? null, "/");
  }, [searchParams]);
  const {
    sendLoginEmailOtp,
    verifyLoginEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    error,
  } = useAuth();

  const [method, setMethod] = useState<Method>(null);
  const [step, setStep] = useState<Step>("method");

  // Email state
  const [email, setEmail] = useState("");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [countryCode, setCountryCode] = useState("");

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [hasRequestedOtp, setHasRequestedOtp] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { secondsRemaining, canResend, startCooldown } = useOtpResendTimer();

  const buildRegisterProfileUrl = React.useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams({
        step: "profile",
        ...params,
      });
      if (redirect) next.set("redirect", redirect);
      return `/auth/register?${next.toString()}`;
    },
    [redirect],
  );

  const handleSelectMethod = (m: Method) => {
    setMethod(m);
    setStep("otp");
    setOtpCode("");
    setOtpSent(false);
    setLocalError(null);
  };

  const handleBack = () => {
    setMethod(null);
    setStep("method");
    setEmail("");
    setPhoneNumber("");
    setCountryCode("");
    setOtpCode("");
    setOtpSent(false);
    setLocalError(null);
  };

  const handleSendOtp = async () => {
    setSending(true);
    setLocalError(null);
    try {
      if (method === "email") {
        await sendLoginEmailOtp(email);
      } else {
        await sendPhoneOtp(phoneNumber);
      }
      setOtpSent(true);
      setHasRequestedOtp(true);
      startCooldown();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.signIn.sendCodeError"));
    } finally {
      setSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || sending) return;
    await handleSendOtp();
  };

  const handleVerifyOtp = async () => {
    setSending(true);
    setLocalError(null);
    try {
      if (method === "email") {
        const result = await verifyLoginEmailOtp(email, otpCode);
        if (result.requiresProfileCompletion) {
          const params: Record<string, string> =
            result.profileCompletionMode === "session"
              ? {
                  mode: "session",
                  ...(typeof result.user?.email === "string" && result.user.email
                    ? { email: result.user.email }
                    : {}),
                }
              : {
                  mode: "email",
                  email,
                  preRegToken: result.preRegToken ?? "",
                };

          router.push(buildRegisterProfileUrl(params));
          return;
        }
      } else {
        const result = await verifyPhoneOtp(phoneNumber, otpCode);
        if (result.needsProfileCompletion) {
          router.push(
            buildRegisterProfileUrl({
              mode: "phone",
              phone: phoneNumber,
              ...(dialCode ? { dialCode } : {}),
              ...(countryCode ? { countryCode } : {}),
            }),
          );
          return;
        }
      }
      router.push(redirect);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("auth.signIn.verifyError"));
    } finally {
      setSending(false);
    }
  };

  const displayError = localError || error;

  // ── Method Selection Screen ──
  if (step === "method") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Sparkles className="h-7 w-7 text-brand" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("auth.signIn.welcomeBack")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("auth.signIn.chooseMethod")}
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
                <p className="font-semibold text-slate-900">{t("auth.signIn.continueWithEmail")}</p>
                <p className="text-sm text-slate-500">
                  {t("auth.signIn.continueWithEmailDesc")}
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
                <p className="font-semibold text-slate-900">{t("auth.signIn.continueWithPhone")}</p>
                <p className="text-sm text-slate-500">
                  {t("auth.signIn.continueWithPhoneDesc")}
                </p>
              </div>
            </button>
          </div>

          <p className="text-sm text-slate-400">
            {t("auth.signIn.noAccount")}{" "}
            <Link href={redirect !== "/" ? `/auth/register?redirect=${encodeURIComponent(redirect)}` : "/auth/register"} className="font-medium text-brand hover:underline">
              {t("auth.signIn.createOne")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── OTP Screen (fullscreen isolation) ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("auth.signIn.back")}
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
            <KeyRound className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {otpSent
              ? t("auth.signIn.enterVerificationCode")
              : method === "email"
                ? t("auth.signIn.enterYourEmail")
                : t("auth.signIn.enterYourPhone")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {otpSent
              ? t("auth.signIn.sentCodeTo", { target: method === "email" ? email : phoneNumber })
              : method === "email"
                ? t("auth.signIn.emailCodeHint")
                : t("auth.signIn.phoneCodeHint")}
          </p>
        </div>

        <div className="space-y-4">
          {!otpSent ? (
            <>
              {method === "email" ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.signIn.emailPlaceholder")}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              ) : (
                <PhoneInput
                  value={phoneNumber}
                  onChange={(full, dial, nextCountryCode) => {
                    setPhoneNumber(full);
                    setDialCode(dial);
                    setCountryCode(nextCountryCode ?? "");
                  }}
                />
              )}

              <button
                onClick={handleSendOtp}
                disabled={
                  sending ||
                  (!email && method === "email") ||
                  (!phoneNumber && method === "phone") ||
                  (hasRequestedOtp && !canResend)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signIn.sendCode")}
              </button>
              {hasRequestedOtp && !canResend && (
                <p className="text-center text-xs text-slate-500" aria-live="polite">
                  {t("auth.signIn.resendIn", { seconds: secondsRemaining })}
                </p>
              )}
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={t("auth.signIn.codePlaceholder")}
                maxLength={6}
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] shadow-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />

              <button
                onClick={handleVerifyOtp}
                disabled={sending || otpCode.length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signIn.verifySignIn")}
              </button>

              <p className="text-center text-xs text-slate-500" aria-live="polite">
                {canResend
                  ? t("auth.signIn.resendReady")
                  : t("auth.signIn.resendIn", { seconds: secondsRemaining })}
              </p>
              <button
                onClick={() => void handleResendOtp()}
                disabled={sending || !canResend}
                className="w-full text-center text-sm text-slate-500 hover:text-brand disabled:opacity-50 disabled:hover:text-slate-500"
              >
                {t("auth.signIn.resendCode")}
              </button>
            </>
          )}

          {displayError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {displayError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense>
      <SignInPageInner />
    </React.Suspense>
  );
}
