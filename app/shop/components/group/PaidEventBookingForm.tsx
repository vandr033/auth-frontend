"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicGroupEvent, GroupPaymentMethod } from "@/app/shop/lib/groupReservationsApi";
import type { ShopSettings } from "@/types/shop";
import { GroupPaymentMethodForm } from "@/app/shop/components/group/GroupPaymentMethodForm";

type ExtraAttendeeForm = {
  full_name: string;
  email: string;
  phone: string;
};

type PaidEventBookingFormProps = {
  event: PublicGroupEvent;
  settings: ShopSettings | null;
  bookedSpots: string;
  onBookedSpotsChange: (value: string) => void;
  extraAttendees: ExtraAttendeeForm[];
  onExtraAttendeesChange: React.Dispatch<React.SetStateAction<ExtraAttendeeForm[]>>;
  paymentMethod: GroupPaymentMethod;
  onPaymentMethodChange: (method: GroupPaymentMethod) => void;
  qrProofFile: File | null;
  onQrProofChange: (file: File | null) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  busy: boolean;
  disableSubmit?: boolean;
  onSubmit: () => void | Promise<void>;
  submitLabel: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function PaidEventBookingForm({
  event,
  settings,
  bookedSpots,
  onBookedSpotsChange,
  extraAttendees,
  onExtraAttendeesChange,
  paymentMethod,
  onPaymentMethodChange,
  qrProofFile,
  onQrProofChange,
  notes,
  onNotesChange,
  busy,
  disableSubmit = false,
  onSubmit,
  submitLabel,
  t,
}: PaidEventBookingFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t("shopGroup.fields.spots")}</label>
        <Input
          type="number"
          min={1}
          max={Math.max(1, event.max_capacity)}
          value={bookedSpots}
          onChange={(e) => {
            const val = Number.parseInt(e.target.value, 10);
            const max = Math.max(1, event.max_capacity);
            onBookedSpotsChange(Number.isInteger(val) && val > max ? String(max) : e.target.value);
          }}
        />
      </div>

      {extraAttendees.length > 0 ? (
        <div className="space-y-3 rounded-md border border-surface-border bg-section p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("shopGroup.forms.extraAttendeesTitle")}
          </p>
          <div className="space-y-3">
            {extraAttendees.map((attendee, index) => (
              <div key={`extra-attendee-${index}`} className="rounded-md border border-surface-border bg-surface p-3">
                <p className="mb-2 text-xs font-medium text-text-muted">{t("shopGroup.forms.extraTicketLabel", { number: index + 2 })}</p>
                <div className="grid gap-2">
                  <Input
                    placeholder={t("shopGroup.forms.fullNamePlaceholder")}
                    value={attendee.full_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      onExtraAttendeesChange((prev) => prev.map((row, rowIndex) => (
                        rowIndex === index ? { ...row, full_name: value } : row
                      )));
                    }}
                  />
                  <Input
                    type="email"
                    placeholder={t("shopGroup.forms.emailOptionalPlaceholder")}
                    value={attendee.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      onExtraAttendeesChange((prev) => prev.map((row, rowIndex) => (
                        rowIndex === index ? { ...row, email: value } : row
                      )));
                    }}
                  />
                  <Input
                    placeholder={t("shopGroup.forms.phoneOptionalPlaceholder")}
                    value={attendee.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      onExtraAttendeesChange((prev) => prev.map((row, rowIndex) => (
                        rowIndex === index ? { ...row, phone: value } : row
                      )));
                    }}
                  />
                  <p className="text-[11px] text-text-muted">{t("shopGroup.forms.contactHint")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <GroupPaymentMethodForm
        settings={settings}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={onPaymentMethodChange}
        qrProofFile={qrProofFile}
        onQrProofChange={onQrProofChange}
        t={t}
      />

      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t("shopGroup.fields.notes")}</label>
        <textarea
          className="min-h-[90px] w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-text-main"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t("shopGroup.forms.notesPlaceholder")}
        />
      </div>

      <Button
        className="w-full bg-brand text-white hover:bg-brand-hover"
        onClick={() => void onSubmit()}
        disabled={busy || disableSubmit}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
