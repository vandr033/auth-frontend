"use client";
/* eslint-disable @next/next/no-img-element */

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-url";
import type { GroupPaymentMethod } from "@/app/shop/lib/groupReservationsApi";
import type { ShopSettings } from "@/types/shop";
import { QrProofPreview } from "@/app/shop/components/QrProofPreview";

type GroupPaymentMethodFormProps = {
  settings: ShopSettings | null;
  paymentMethod: GroupPaymentMethod;
  onPaymentMethodChange: (method: GroupPaymentMethod) => void;
  qrProofFile: File | null;
  onQrProofChange: (file: File | null) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function GroupPaymentMethodForm({
  settings,
  paymentMethod,
  onPaymentMethodChange,
  qrProofFile,
  onQrProofChange,
  t,
}: GroupPaymentMethodFormProps) {
  const allowCash = settings?.allow_cash_payment ?? true;
  const allowQr = settings?.allow_qr_payment ?? true;
  const requireQrProof = settings?.require_comprobante_for_qr !== false;

  return (
    <div className="space-y-3 rounded-lg border border-surface-border bg-surface p-4">
      <h4 className="text-sm font-semibold text-text-main">{t("shopGroup.payment.title")}</h4>

      <div className="space-y-2">
        {allowCash ? (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
              paymentMethod === "CASH" ? "border-brand bg-brand/5" : "border-surface-border",
            )}
          >
            <input
              type="radio"
              name="group-payment-method"
              checked={paymentMethod === "CASH"}
              onChange={() => onPaymentMethodChange("CASH")}
            />
            <span>{t("shopGroup.payment.cash")}</span>
          </label>
        ) : null}

        {allowQr ? (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
              paymentMethod === "QR" ? "border-brand bg-brand/5" : "border-surface-border",
            )}
          >
            <input
              type="radio"
              name="group-payment-method"
              checked={paymentMethod === "QR"}
              onChange={() => onPaymentMethodChange("QR")}
            />
            <span>{t("shopGroup.payment.qr")}</span>
          </label>
        ) : null}

        {!allowCash && !allowQr ? (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
              paymentMethod === "NONE" ? "border-brand bg-brand/5" : "border-surface-border",
            )}
          >
            <input
              type="radio"
              name="group-payment-method"
              checked={paymentMethod === "NONE"}
              onChange={() => onPaymentMethodChange("NONE")}
            />
            <span>{t("shopGroup.payment.none")}</span>
          </label>
        ) : null}
      </div>

      {paymentMethod === "QR" ? (
        <div className="space-y-3 rounded-md border border-surface-border bg-section p-3">
          {settings?.qr_image_url ? (
            <div className="rounded-md border border-surface-border bg-white p-3">
              <img
                src={getImageUrl(settings.qr_image_url) || undefined}
                alt={t("shopGroup.payment.qrCode")}
                className="mx-auto h-44 w-44 object-contain"
              />
            </div>
          ) : (
            <p className="text-xs text-text-muted">{t("shopGroup.payment.qrMissing")}</p>
          )}

          <div className="space-y-2">
            <p className="text-xs text-text-muted">
              {requireQrProof ? t("shopGroup.payment.uploadProofRequired") : t("shopGroup.payment.uploadProofOptional")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => document.getElementById("group-qr-proof-upload")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {qrProofFile ? t("shopGroup.payment.changeProof") : t("shopGroup.payment.uploadProof")}
            </Button>
            <input
              id="group-qr-proof-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                onQrProofChange(file);
              }}
            />
            {qrProofFile ? (
              <QrProofPreview
                file={qrProofFile}
                alt={t("shopGroup.payment.uploadProof")}
                removeLabel={t("shopGroup.payment.removeProof")}
                onRemove={() => onQrProofChange(null)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
