"use client";

import React from "react";

import { useT } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeConfig } from "@/utils/themepicker";

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-text-muted";
const inputWrapperClass = "flex flex-col gap-2";

const selectClass =
  "w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text-main shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand";

export default function ThemeSettings() {
  const t = useT();
  const { config, setThemeConfig } = useTheme();

  const handleSelectChange = <K extends keyof ThemeConfig>(
    key: K,
    value: ThemeConfig[K],
  ) => {
    setThemeConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form
      className="grid gap-4 text-sm text-text-main sm:grid-cols-2"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className={inputWrapperClass}>
        <span className={labelClass}>{t("adminTheme.brandColor")}</span>
        <input
          type="color"
          value={config.brandColor}
          onChange={(event) =>
            handleSelectChange("brandColor", event.target.value)
          }
          className="h-10 w-16 cursor-pointer rounded-md border border-surface-border bg-surface"
        />
      </label>
      <label className={inputWrapperClass}>
        <span className={labelClass}>{t("adminTheme.pageBackground")}</span>
        <input
          type="color"
          value={config.pageBackgroundColor}
          onChange={(event) =>
            handleSelectChange("pageBackgroundColor", event.target.value)
          }
          className="h-10 w-16 cursor-pointer rounded-md border border-surface-border bg-surface"
        />
      </label>
      <label className={inputWrapperClass}>
        <span className={labelClass}>{t("adminTheme.backgroundPreset")}</span>
        <select
          value={config.pageBackgroundPreset}
          onChange={(event) =>
            handleSelectChange(
              "pageBackgroundPreset",
              event.target.value as ThemeConfig["pageBackgroundPreset"],
            )
          }
          className={selectClass}
        >
          <option value="auto">{t("adminTheme.presetAuto")}</option>
          <option value="light">{t("adminTheme.presetLight")}</option>
          <option value="soft">{t("adminTheme.presetSoft")}</option>
          <option value="dark">{t("adminTheme.presetDark")}</option>
        </select>
      </label>
      <label className={inputWrapperClass}>
        <span className={labelClass}>{t("adminTheme.cornerRadius")}</span>
        <select
          value={config.cornerRadius}
          onChange={(event) =>
            handleSelectChange(
              "cornerRadius",
              event.target.value as ThemeConfig["cornerRadius"],
            )
          }
          className={selectClass}
        >
          <option value="sm">{t("adminTheme.radiusSmall")}</option>
          <option value="md">{t("adminTheme.radiusMedium")}</option>
          <option value="lg">{t("adminTheme.radiusLarge")}</option>
        </select>
      </label>
      <label className={inputWrapperClass}>
        <span className={labelClass}>{t("adminTheme.fontPairing")}</span>
        <select
          value={config.fontPreset}
          onChange={(event) =>
            handleSelectChange(
              "fontPreset",
              event.target.value as ThemeConfig["fontPreset"],
            )
          }
          className={selectClass}
        >
          <option value="modern">{t("adminTheme.fontModern")}</option>
          <option value="rounded">{t("adminTheme.fontRounded")}</option>
          <option value="heritage">{t("adminTheme.fontHeritage")}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 rounded-md border border-surface-border bg-surface px-3 py-2 shadow-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={config.cardsElevated}
          onChange={(event) =>
            handleSelectChange("cardsElevated", event.target.checked)
          }
          className="size-4 rounded border-surface-border text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        />
        <span className="text-sm text-text-main">{t("adminTheme.cardsElevated")}</span>
      </label>
    </form>
  );
}
