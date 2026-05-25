"use client";

import React from "react";

import { CountryPhoneSelect } from "@/components/ui/country-phone-select";
import {
  DEFAULT_COUNTRY_CODE,
  normalizePhoneSelection,
  type NormalizedPhoneSelection,
} from "@/lib/phone-country";

interface PhoneInputProps {
  phoneNumber: string;
  phonePrefix?: string;
  countryCode?: string;
  onChange: (value: NormalizedPhoneSelection) => void;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({
  phoneNumber,
  phonePrefix,
  countryCode,
  onChange,
  defaultCountry,
  placeholder,
  className,
  disabled,
}: PhoneInputProps) {
  const selection = React.useMemo(
    () =>
      normalizePhoneSelection({
        countryCode,
        phonePrefix,
        phoneNumber,
        fallbackCountryCode: defaultCountry || DEFAULT_COUNTRY_CODE,
      }),
    [countryCode, defaultCountry, phoneNumber, phonePrefix],
  );

  return (
    <CountryPhoneSelect
      className={className}
      disabled={disabled}
      placeholder={placeholder}
      countryCode={selection.countryCode}
      phonePrefix={selection.phonePrefix}
      phoneNumber={selection.phoneNumber}
      defaultCountryCode={defaultCountry || DEFAULT_COUNTRY_CODE}
      onChange={(nextValue) => {
        onChange(nextValue);
      }}
    />
  );
}
