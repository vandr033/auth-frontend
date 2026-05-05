import { countries, type Country } from "@/lib/country-data";

export const DEFAULT_COUNTRY_CODE = "BO";
export const DEFAULT_PHONE_PREFIX = "591";

export type NormalizedPhoneSelection = {
  country: Country;
  countryCode: string;
  phonePrefix: string;
  phoneNumber: string;
  dialCode: string;
  fullPhone: string;
};

export function normalizePhoneDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function normalizeCountryCode(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

export function formatDialCode(prefix?: string | null): string {
  const digits = normalizePhoneDigits(prefix);
  return digits ? `+${digits}` : "";
}

export function findCountryByCode(countryCode?: string | null): Country | null {
  const normalizedCode = normalizeCountryCode(countryCode);
  if (!normalizedCode) return null;
  return countries.find((country) => country.code === normalizedCode) ?? null;
}

export function findCountriesByPrefix(phonePrefix?: string | null): Country[] {
  const normalizedPrefix = normalizePhoneDigits(phonePrefix);
  if (!normalizedPrefix) return [];
  return countries.filter(
    (country) => normalizePhoneDigits(country.dialCode) === normalizedPrefix,
  );
}

export function findCountryByPrefix(
  phonePrefix?: string | null,
  preferredCountryCode?: string | null,
): Country | null {
  const matches = findCountriesByPrefix(phonePrefix);
  if (matches.length === 0) return null;

  const preferred = findCountryByCode(preferredCountryCode);
  if (preferred) {
    const preferredMatch = matches.find((country) => country.code === preferred.code);
    if (preferredMatch) return preferredMatch;
  }

  return matches[0] ?? null;
}

export function resolveCountry(params?: {
  countryCode?: string | null;
  phonePrefix?: string | null;
  fallbackCountryCode?: string | null;
}): Country {
  const fallbackCountry =
    findCountryByCode(params?.fallbackCountryCode) ??
    findCountryByCode(DEFAULT_COUNTRY_CODE) ??
    countries[0];

  const byCode = findCountryByCode(params?.countryCode);
  if (byCode) return byCode;

  const byPrefix = findCountryByPrefix(params?.phonePrefix, params?.fallbackCountryCode);
  if (byPrefix) return byPrefix;

  return fallbackCountry;
}

export function normalizePhoneSelection(params?: {
  countryCode?: string | null;
  phonePrefix?: string | null;
  phoneNumber?: string | null;
  fallbackCountryCode?: string | null;
}): NormalizedPhoneSelection {
  const country = resolveCountry(params);
  const resolvedPrefix =
    normalizePhoneDigits(params?.phonePrefix) ||
    normalizePhoneDigits(country.dialCode) ||
    DEFAULT_PHONE_PREFIX;
  let resolvedNumber = normalizePhoneDigits(params?.phoneNumber);

  if (
    resolvedNumber.startsWith(resolvedPrefix) &&
    resolvedNumber.length > resolvedPrefix.length + 5
  ) {
    resolvedNumber = resolvedNumber.slice(resolvedPrefix.length);
  }

  return {
    country,
    countryCode: country.code,
    phonePrefix: resolvedPrefix,
    phoneNumber: resolvedNumber,
    dialCode: formatDialCode(resolvedPrefix),
    fullPhone: resolvedNumber ? `${formatDialCode(resolvedPrefix)}${resolvedNumber}` : "",
  };
}

export function splitPhoneValue(params: {
  value?: string | null;
  countryCode?: string | null;
  phonePrefix?: string | null;
  fallbackCountryCode?: string | null;
}): NormalizedPhoneSelection {
  const valueDigits = normalizePhoneDigits(params.value);
  const baseSelection = normalizePhoneSelection({
    countryCode: params.countryCode,
    phonePrefix: params.phonePrefix,
    phoneNumber: "",
    fallbackCountryCode: params.fallbackCountryCode,
  });

  if (!valueDigits) {
    return baseSelection;
  }

  let nextNumber = valueDigits;
  if (
    nextNumber.startsWith(baseSelection.phonePrefix) &&
    nextNumber.length > baseSelection.phonePrefix.length + 5
  ) {
    nextNumber = nextNumber.slice(baseSelection.phonePrefix.length);
  }

  return normalizePhoneSelection({
    countryCode: baseSelection.countryCode,
    phonePrefix: baseSelection.phonePrefix,
    phoneNumber: nextNumber,
    fallbackCountryCode: params.fallbackCountryCode,
  });
}
