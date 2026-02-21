"use client";

import React, { useState, useEffect } from "react";
import {
    Palette,
    Save,
    Loader2,
    Check,
    AlertCircle,
    LayoutTemplate
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ThemePreview } from "@/components/ThemePreview";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { type ThemeConfig, type PageBackgroundPreset, type FontPreset } from "@/utils/themepicker";
import { mainSiteThemeConfig } from "@/theme/mainSiteTheme";

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function ThemePage() {
    const { isAuthenticated, loading: authLoading } = useAdminAuth();

    // State
    const [config, setConfig] = useState<ThemeConfig>(mainSiteThemeConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch theme
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchTheme = async () => {
            try {
                const response = await fetch(getApiUrl("/admin/theme"), {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json.data) {
                        // Map API snake_case to camelCase
                        const mappedConfig: Partial<ThemeConfig> = {
                            brandColor: json.data.brand_color,
                            pageBackgroundColor: json.data.page_background_color,
                            pageBackgroundPreset: json.data.page_background_preset,
                            cardsElevated: json.data.cards_elevated,
                            cornerRadius: json.data.corner_radius,
                            fontPreset: json.data.font_preset || "modern" // fallback if not present
                        };

                        // Merge with default to ensure all fields exist
                        setConfig(prev => ({ ...prev, ...mappedConfig }));
                    }
                } else if (response.status !== 404) {
                    // 404 just means no custom theme yet, keep defaults
                    console.error("Failed to fetch theme:", response.statusText);
                }
            } catch (err) {
                console.error("Error fetching theme:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTheme();
    }, [isAuthenticated]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Map camelCase to snake_case for API
            const payload = {
                brand_color: config.brandColor,
                page_background_color: config.pageBackgroundColor,
                page_background_preset: config.pageBackgroundPreset,
                cards_elevated: config.cardsElevated,
                corner_radius: config.cornerRadius,
                font_preset: config.fontPreset
            };

            const response = await fetch(getApiUrl("/admin/theme"), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update theme");
            }

            setSuccess("Theme updated successfully. Your changes are live.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        // Clear success message when user modifies form to encourage re-saving
        if (success) setSuccess(null);
    };

    if (authLoading || loading) {
        return (
            <div className="flex bg-page h-[50vh] flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p className="text-text-muted">Loading theme settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">Theme Settings</h1>
                    <p className="text-text-muted">Customize the look and feel of your public booking page.</p>
                </div>
                <div className="flex items-center gap-2">
                    {success && (
                        <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 animate-in fade-in">
                            <Check className="h-4 w-4" /> Saved!
                        </span>
                    )}
                    {error && (
                        <span className="flex items-center gap-1 text-sm font-medium text-rose-600 animate-in fade-in">
                            <AlertCircle className="h-4 w-4" /> {error}
                        </span>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand text-white hover:bg-brand-hover min-w-[120px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-10">
                {/* Editor Section */}
                <div className="space-y-6">
                    <Card className="border-surface-border bg-surface shadow-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Palette className="h-5 w-5 text-brand" />
                                Appearance
                            </CardTitle>
                            <CardDescription>
                                Set your brand colors and styles. Use the sections below to customize your site.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {/* Brand Color */}
                            <div className="space-y-3">
                                <Label htmlFor="brandColor">Brand Color</Label>
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-surface-border shadow-sm">
                                        <input
                                            type="color"
                                            id="brandColor"
                                            value={config.brandColor}
                                            onChange={(e) => updateConfig("brandColor", e.target.value)}
                                            className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                        />
                                    </div>
                                    <Input
                                        value={config.brandColor}
                                        onChange={(e) => updateConfig("brandColor", e.target.value)}
                                        className="font-mono uppercase"
                                        placeholder="#000000"
                                        maxLength={9}
                                    />
                                </div>
                                <p className="text-xs text-text-muted">
                                    Primary buttons & accents.
                                </p>
                            </div>

                            {/* Background Color */}
                            <div className="space-y-3">
                                <Label htmlFor="pageBackgroundColor">Page Background</Label>
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-surface-border shadow-sm">
                                        <input
                                            type="color"
                                            id="pageBackgroundColor"
                                            value={config.pageBackgroundColor}
                                            onChange={(e) => updateConfig("pageBackgroundColor", e.target.value)}
                                            className="h-full w-full cursor-pointer border-0 p-0 scale-150"
                                        />
                                    </div>
                                    <Input
                                        value={config.pageBackgroundColor}
                                        onChange={(e) => updateConfig("pageBackgroundColor", e.target.value)}
                                        className="font-mono uppercase"
                                        placeholder="#000000"
                                        maxLength={9}
                                    />
                                </div>
                                <p className="text-xs text-text-muted">
                                    Base background color.
                                </p>
                            </div>

                            {/* Background Preset */}
                            <div className="space-y-3">
                                <Label htmlFor="preset">Background Preset</Label>
                                <Select
                                    value={config.pageBackgroundPreset}
                                    onValueChange={(v) => updateConfig("pageBackgroundPreset", v as PageBackgroundPreset)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select preset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto (Contrast Based)</SelectItem>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="soft">Soft (Low Contrast)</SelectItem>
                                        <SelectItem value="dark">Dark</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-text-muted">
                                    Shade generation strategy.
                                </p>
                            </div>

                            {/* Typography */}
                            <div className="space-y-3">
                                <Label htmlFor="font">Typography</Label>
                                <Select
                                    value={config.fontPreset}
                                    onValueChange={(v) => updateConfig("fontPreset", v as FontPreset)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select font style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="modern">Modern Sans</SelectItem>
                                        <SelectItem value="rounded">Rounded Sans</SelectItem>
                                        <SelectItem value="heritage">Heritage Serif</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-text-muted">
                                    Global font family.
                                </p>
                            </div>

                            {/* Corner Radius */}
                            <div className="space-y-3">
                                <Label htmlFor="radius">Corner Radius</Label>
                                <Select
                                    value={config.cornerRadius}
                                    onValueChange={(v) => updateConfig("cornerRadius", v as ThemeConfig["cornerRadius"])}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select radius" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sm">Small</SelectItem>
                                        <SelectItem value="md">Medium</SelectItem>
                                        <SelectItem value="lg">Large</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-text-muted">
                                    Roundness of UI elements.
                                </p>
                            </div>

                            {/* Card Elevation */}
                            <div className="flex flex-col gap-3 rounded-md border border-surface-border p-3 justify-center">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base cursor-pointer" htmlFor="cardsElevated">Elevated Cards</Label>
                                    <Switch
                                        id="cardsElevated"
                                        checked={config.cardsElevated}
                                        onCheckedChange={(c) => updateConfig("cardsElevated", c)}
                                    />
                                </div>
                                <p className="text-xs text-text-muted">Add shadow depth to cards.</p>
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-text-muted">
                        <LayoutTemplate className="h-4 w-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Live Preview</span>
                    </div>
                    <div className="rounded-xl border-2 border-dashed border-surface-border bg-page p-4 lg:p-10 flex items-center justify-center">
                        <div className="w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                            <ThemePreview config={config} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
