"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { countries, detectDefaultCountry, searchCountries, type Country } from "@/lib/country-data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
    value: string;
    onChange: (fullNumber: string, dialCode: string) => void;
    defaultCountry?: string; // ISO code e.g. "LB"
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
    const t = useT();
    const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
        if (defaultCountry) {
            const found = countries.find((c) => c.code === defaultCountry);
            if (found) return found;
        }
        return detectDefaultCountry();
    });

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Parse the local number (without dial code) from value
    const localNumber = useMemo(() => {
        if (!value) return "";
        // If value starts with the dial code, strip it
        const dialDigits = selectedCountry.dialCode.replace("+", "");
        if (value.startsWith(selectedCountry.dialCode)) {
            return value.slice(selectedCountry.dialCode.length);
        }
        if (value.startsWith(dialDigits)) {
            return value.slice(dialDigits.length);
        }
        return value;
    }, [value, selectedCountry]);

    const filteredCountries = useMemo(() => searchCountries(search), [search]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
            setSearch("");
            setHighlightIndex(0);
        }
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const items = listRef.current.querySelectorAll("[data-country-item]");
        items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }, [highlightIndex, isOpen]);

    const handleSelectCountry = useCallback(
        (country: Country) => {
            setSelectedCountry(country);
            setIsOpen(false);
            setSearch("");
            // Re-emit with new dial code
            onChange(country.dialCode + localNumber, country.dialCode);
        },
        [localNumber, onChange],
    );

    const handleLocalNumberChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            onChange(selectedCountry.dialCode + raw, selectedCountry.dialCode);
        },
        [selectedCountry, onChange],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightIndex((prev) =>
                        prev < filteredCountries.length - 1 ? prev + 1 : 0,
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredCountries.length - 1,
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    if (filteredCountries[highlightIndex]) {
                        handleSelectCountry(filteredCountries[highlightIndex]);
                    }
                    break;
                case "Escape":
                    setIsOpen(false);
                    break;
            }
        },
        [isOpen, filteredCountries, highlightIndex, handleSelectCountry],
    );

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <div className="flex items-stretch rounded-lg border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 dark:border-slate-700 dark:bg-slate-900">
                {/* Country picker button */}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen((prev) => !prev)}
                    disabled={disabled}
                    className="flex items-center gap-1.5 border-r border-slate-200 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                    <span className="text-lg leading-none">{selectedCountry.flag}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                        {selectedCountry.dialCode}
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 text-slate-400 transition-transform",
                            isOpen && "rotate-180",
                        )}
                    />
                </button>

                {/* Phone number input */}
                <input
                    type="tel"
                    inputMode="numeric"
                    value={localNumber}
                    onChange={handleLocalNumberChange}
                    placeholder={placeholder ?? t("common.phoneNumber")}
                    disabled={disabled}
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    onKeyDown={handleKeyDown}
                >
                    {/* Search input */}
                    <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setHighlightIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={t("sharedUi.searchCountryOrCode")}
                                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Country list */}
                    <div ref={listRef} className="max-h-60 overflow-y-auto">
                        {filteredCountries.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-slate-400">
                                {t("sharedUi.noCountriesFound")}
                            </div>
                        ) : (
                            filteredCountries.map((country, index) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    data-country-item
                                    onClick={() => handleSelectCountry(country)}
                                    className={cn(
                                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                                        index === highlightIndex
                                            ? "bg-brand/5 text-brand"
                                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                                        selectedCountry.code === country.code && "font-semibold",
                                    )}
                                >
                                    <span className="text-lg leading-none">{country.flag}</span>
                                    <span className="flex-1 truncate">{country.name}</span>
                                    <span className="text-xs font-medium text-slate-400">
                                        {country.dialCode}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
