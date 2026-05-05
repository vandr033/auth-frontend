"use client";

import React from "react";
import { ChevronDown, Search } from "lucide-react";

import { useT } from "@/lib/i18n";
import { searchCountries, type Country } from "@/lib/country-data";
import {
  DEFAULT_COUNTRY_CODE,
  normalizePhoneDigits,
  normalizePhoneSelection,
  resolveCountry,
} from "@/lib/phone-country";
import { cn } from "@/lib/utils";

export type CountryPhoneValue = {
  country: Country;
  countryCode: string;
  countryName: string;
  phonePrefix: string;
  dialCode: string;
  phoneNumber: string;
  fullPhone: string;
  flag: string;
};

interface CountryPhoneSelectProps {
  countryCode?: string | null;
  phonePrefix?: string | null;
  phoneNumber?: string | null;
  defaultCountryCode?: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: CountryPhoneValue) => void;
}

function buildValue(params: {
  country: Country;
  phoneNumber?: string | null;
}): CountryPhoneValue {
  const phonePrefix = normalizePhoneDigits(params.country.dialCode);
  const phoneNumber = normalizePhoneDigits(params.phoneNumber);
  const dialCode = `+${phonePrefix}`;

  return {
    country: params.country,
    countryCode: params.country.code,
    countryName: params.country.name,
    phonePrefix,
    dialCode,
    phoneNumber,
    fullPhone: phoneNumber ? `${dialCode}${phoneNumber}` : "",
    flag: params.country.flag,
  };
}

export function CountryPhoneSelect({
  countryCode,
  phonePrefix,
  phoneNumber,
  defaultCountryCode,
  placeholder,
  className,
  disabled,
  onChange,
}: CountryPhoneSelectProps) {
  const t = useT();
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const fallbackCountryCode = defaultCountryCode || DEFAULT_COUNTRY_CODE;
  const selectedCountry = React.useMemo(
    () =>
      resolveCountry({
        countryCode,
        phonePrefix,
        fallbackCountryCode,
      }),
    [countryCode, fallbackCountryCode, phonePrefix],
  );
  const selection = React.useMemo(
    () =>
      normalizePhoneSelection({
        countryCode: selectedCountry.code,
        phonePrefix,
        phoneNumber,
        fallbackCountryCode,
      }),
    [fallbackCountryCode, phoneNumber, phonePrefix, selectedCountry.code],
  );

  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);

  const filteredCountries = React.useMemo(() => searchCountries(search), [search]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => searchInputRef.current?.focus(), 50);
    setSearch("");
    setHighlightIndex(0);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-country-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, isOpen]);

  const emitChange = React.useCallback(
    (country: Country, nextPhoneNumber: string) => {
      onChange(buildValue({ country, phoneNumber: nextPhoneNumber }));
    },
    [onChange],
  );

  const handleSelectCountry = React.useCallback(
    (country: Country) => {
      setIsOpen(false);
      setSearch("");
      emitChange(country, selection.phoneNumber);
    },
    [emitChange, selection.phoneNumber],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightIndex((current) =>
            current < filteredCountries.length - 1 ? current + 1 : 0,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightIndex((current) =>
            current > 0 ? current - 1 : filteredCountries.length - 1,
          );
          break;
        case "Enter":
          event.preventDefault();
          if (filteredCountries[highlightIndex]) {
            handleSelectCountry(filteredCountries[highlightIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
      }
    },
    [filteredCountries, handleSelectCountry, highlightIndex, isOpen],
  );

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 dark:border-slate-700 dark:bg-slate-900">
        {/* Row 1 — country selector (full width) */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((current) => !current)}
          disabled={disabled}
          className="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <span className="text-lg leading-none">{selection.country.flag}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-700 dark:text-slate-300">
              {selection.country.name}
            </span>
            <span className="block text-xs text-slate-400">{selection.dialCode}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {/* Row 2 — phone number input (full width) */}
        <input
          type="tel"
          inputMode="numeric"
          value={selection.phoneNumber}
          onChange={(event) => emitChange(selectedCountry, event.target.value)}
          placeholder={placeholder ?? t("common.phoneNumber")}
          disabled={disabled}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          onKeyDown={handleKeyDown}
        >
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setHighlightIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("sharedUi.searchCountryOrCode")}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {t("sharedUi.noCountriesFound")}
              </div>
            ) : (
              filteredCountries.map((country, index) => {
                const isSelected = selection.country.code === country.code;
                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    data-country-item
                    onClick={() => handleSelectCountry(country)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      index === highlightIndex
                        ? "bg-brand/5 text-brand"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                      isSelected && "font-semibold",
                    )}
                  >
                    <span className="text-lg leading-none">{country.flag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{country.name}</span>
                      <span className="block text-xs text-slate-400">{country.code}</span>
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
