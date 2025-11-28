"use client";

import React from "react";

import { useTheme } from "@/theme/ThemeContext";
import type { ThemeConfig } from "@/utils/themepicker";

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-text-muted";
const inputWrapperClass = "flex flex-col gap-2";

const selectClass =
  "w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text-main shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand";

export default function ThemeSettings() {
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
        <span className={labelClass}>Brand color</span>
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
        <span className={labelClass}>Page background color</span>
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
        <span className={labelClass}>Page background preset</span>
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
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="soft">Soft</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className={inputWrapperClass}>
        <span className={labelClass}>Corner radius</span>
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
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
      <label className={inputWrapperClass}>
        <span className={labelClass}>Typography</span>
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
          <option value="modern">Modern Sans</option>
          <option value="rounded">Rounded Sans</option>
          <option value="heritage">Heritage Serif</option>
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
        <span className="text-sm text-text-main">Cards elevated</span>
      </label>
    </form>
  );
}
