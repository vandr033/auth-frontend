"use client";

import React from "react";
import Link from "next/link";
import { Loader2, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useT } from "@/lib/i18n";
import { appendShopParam } from "@/app/lib/shop-context";
import { submitFreeEventRegistration, type FreeRegistrationResult } from "@/app/shop/lib/groupReservationsApi";

interface Props {
  eventId: number;
  companyId: number;
  slug: string;
  customTos?: string | null;
  prefill: {
    firstName: string;
    lastName: string;
    gender: string;
    age: number | null;
    email: string;
    phonePrefix: string;
    phoneNumber: string;
  } | null;
  existingStatus: "CONFIRMED" | "PENDING" | "INTERESTED" | null;
  onRegistered?: (status: "CONFIRMED" | "PENDING" | "INTERESTED") => void;
  onSubmitResult?: (
    result: FreeRegistrationResult,
    contact: { email: string; phonePrefix: string; phoneNumber: string },
  ) => void;
}

type ModalState = "none" | "tos";

export function FreeEventRegistrationForm({
  eventId,
  companyId,
  slug,
  customTos,
  prefill,
  existingStatus,
  onRegistered,
  onSubmitResult,
}: Props) {
  const t = useT();

  const [firstName, setFirstName] = React.useState(prefill?.firstName ?? "");
  const [lastName, setLastName] = React.useState(prefill?.lastName ?? "");
  const [gender, setGender] = React.useState(prefill?.gender ?? "");
  const [age, setAge] = React.useState(prefill?.age ? String(prefill.age) : "");
  const [email, setEmail] = React.useState(prefill?.email ?? "");
  const [phonePrefix, setPhonePrefix] = React.useState(prefill?.phonePrefix ?? "591");
  const [phoneNumber, setPhoneNumber] = React.useState(prefill?.phoneNumber ?? "");
  const [tosAccepted, setTosAccepted] = React.useState(false);
  const [createAccount, setCreateAccount] = React.useState(false);
  const [otpChannelPreference, setOtpChannelPreference] = React.useState<"email" | "phone">("phone");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [modal, setModal] = React.useState<ModalState>("none");

  // If user already registered, show state instead of form
  if (existingStatus === "CONFIRMED" || existingStatus === "PENDING") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">
            {existingStatus === "CONFIRMED"
              ? t("freeEventReg.alreadyConfirmed")
              : t("freeEventReg.alreadyPending")}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={appendShopParam("/me/group-reservations", slug)}>
            {t("freeEventReg.viewMyReservations")}
          </Link>
        </Button>
      </div>
    );
  }

  if (existingStatus === "INTERESTED") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <p className="text-sm text-amber-700">{t("freeEventReg.alreadyInterested")}</p>
      </div>
    );
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = t("freeEventReg.validation.required");
    if (!lastName.trim()) errs.lastName = t("freeEventReg.validation.required");
    if (!gender) errs.gender = t("freeEventReg.validation.required");
    if (!age || isNaN(Number(age)) || Number(age) < 1) errs.age = t("freeEventReg.validation.required");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t("freeEventReg.validation.invalidEmail");
    if (!phonePrefix) errs.phonePrefix = t("freeEventReg.validation.required");
    if (!phoneNumber.trim()) errs.phoneNumber = t("freeEventReg.validation.invalidPhone");
    if (!tosAccepted) errs.tos = t("freeEventReg.validation.tosRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await submitFreeEventRegistration(eventId, {
        company_id: companyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        age: Number(age),
        email: email.trim().toLowerCase(),
        phonePrefix,
        phoneNumber: phoneNumber.trim(),
        tosAccepted,
        createAccount,
        otpChannelPreference: createAccount ? otpChannelPreference : undefined,
      });

      onRegistered?.(result.registrationStatus ?? (result.eventOutcome === "INTERESTED" ? "INTERESTED" : "CONFIRMED"));
      onSubmitResult?.(result, {
        email: email.trim().toLowerCase(),
        phonePrefix,
        phoneNumber: phoneNumber.trim(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "DUPLICATE_REGISTRATION") {
        setErrors({ _form: t("freeEventReg.validation.duplicateRegistration") });
      } else if (msg === "DUPLICATE_INTEREST") {
        setErrors({ _form: t("freeEventReg.validation.duplicateInterest") });
      } else {
        setErrors({ _form: msg || t("freeEventReg.submitError") });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const genderOptions = [
    { value: "MALE", label: t("freeEventReg.genderOptions.male") },
    { value: "FEMALE", label: t("freeEventReg.genderOptions.female") },
    { value: "OTHER", label: t("freeEventReg.genderOptions.other") },
    { value: "PREFER_NOT_TO_SAY", label: t("freeEventReg.genderOptions.preferNotToSay") },
  ];

  // Build the full phone value for PhoneInput — only prepend dial code when there's a local number
  const phoneFullValue = phoneNumber.trim() ? `+${phonePrefix}${phoneNumber}` : "";

  return (
    <>
      <div className="space-y-3">
        {/* First name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("freeEventReg.firstName")} *</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("freeEventReg.firstName")} />
          {errors.firstName && <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>}
        </div>

        {/* Last name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("freeEventReg.lastName")} *</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("freeEventReg.lastName")} />
          {errors.lastName && <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("freeEventReg.gender")} *</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-text-main focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">{t("freeEventReg.selectGender")}</option>
            {genderOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.gender && <p className="mt-1 text-xs text-rose-600">{errors.gender}</p>}
        </div>

        {/* Age */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("freeEventReg.age")} *</label>
          <Input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder={t("freeEventReg.age")} />
          {errors.age && <p className="mt-1 text-xs text-rose-600">{errors.age}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("freeEventReg.email")} *</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("freeEventReg.email")} />
          {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("freeEventReg.phoneNumber")} *</label>
          <PhoneInput
            value={phoneFullValue}
            onChange={(fullNumber, dialCode) => {
              // dialCode is like "+591"; strip the "+" for our phonePrefix field
              const prefix = dialCode.replace("+", "");
              setPhonePrefix(prefix);
              // Strip the dial code from the full number to get just the local digits
              const stripped = fullNumber.startsWith(dialCode)
                ? fullNumber.slice(dialCode.length)
                : fullNumber.startsWith(prefix)
                  ? fullNumber.slice(prefix.length)
                  : fullNumber;
              setPhoneNumber(stripped.trim());
            }}
          />
          {errors.phoneNumber && <p className="mt-1 text-xs text-rose-600">{errors.phoneNumber}</p>}
        </div>

        {/* TOS */}
        <div className="space-y-1">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand focus:ring-brand"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
            />
            <span className="text-sm text-text-muted">
              <button
                type="button"
                className="text-brand underline underline-offset-2 hover:text-brand-hover"
                onClick={() => setModal("tos")}
              >
                {t("freeEventReg.tosAccept")}
              </button>
            </span>
          </label>
          {errors.tos && <p className="text-xs text-rose-600">{errors.tos}</p>}
        </div>

        {/* Create account */}
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand focus:ring-brand"
            checked={createAccount}
            onChange={(e) => setCreateAccount(e.target.checked)}
          />
          <span className="text-sm text-text-muted">{t("freeEventReg.createAccount")}</span>
        </label>

        {createAccount ? (
          <div className="space-y-2 rounded-md border border-surface-border bg-section px-3 py-2">
            <p className="text-xs font-medium text-text-muted">{t("freeEventReg.account.otpPreferenceTitle")}</p>
            <label className="flex items-center gap-2 text-sm text-text-main">
              <input
                type="radio"
                name="otp_channel_preference"
                className="h-3.5 w-3.5"
                checked={otpChannelPreference === "phone"}
                onChange={() => setOtpChannelPreference("phone")}
              />
              <span>{t("freeEventReg.account.otpPreferenceWhatsapp")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-text-main">
              <input
                type="radio"
                name="otp_channel_preference"
                className="h-3.5 w-3.5"
                checked={otpChannelPreference === "email"}
                onChange={() => setOtpChannelPreference("email")}
              />
              <span>{t("freeEventReg.account.otpPreferenceEmail")}</span>
            </label>
          </div>
        ) : null}

        {/* Form error */}
        {errors._form && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {errors._form}
          </p>
        )}

        <Button
          className="w-full bg-brand text-white hover:bg-brand-hover"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("freeEventReg.confirm")}
        </Button>
      </div>

      {/* TOS modal */}
      {modal === "tos" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-base font-semibold text-text-main">{t("freeEventReg.tos.title")}</h2>
              <button onClick={() => setModal("none")} className="text-text-muted hover:text-text-main">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-text-muted">{customTos || t("freeEventReg.tos.body")}</p>
            <Button
              className="mt-4 w-full bg-brand text-white hover:bg-brand-hover"
              onClick={() => { setTosAccepted(true); setModal("none"); }}
            >
              {t("freeEventReg.tos.action")}
            </Button>
          </div>
        </div>
      )}

    </>
  );
}
