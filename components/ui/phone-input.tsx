"use client";

import React from "react";

import { CountryPhoneSelect } from "@/components/ui/country-phone-select";
import {
  DEFAULT_COUNTRY_CODE,
  splitPhoneValue,
} from "@/lib/phone-country";

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string, dialCode: string, countryCode?: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  placeholder,
  className,
  disabled,
}: PhoneInputProps) {
  const selection = React.useMemo(
    () =>
      splitPhoneValue({
        value,
        countryCode: defaultCountry,
        fallbackCountryCode: defaultCountry || DEFAULT_COUNTRY_CODE,
      }),
    [defaultCountry, value],
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
        onChange(nextValue.fullPhone, nextValue.dialCode, nextValue.countryCode);
      }}
    />
  );
}
