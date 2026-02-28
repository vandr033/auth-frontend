"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    Save,
    Image as ImageIcon,
    Home,
    Info,
    Users,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface StaffMember {
    id: number;
    display_name: string;
    role: string;
    bio?: string;
    image_url?: string;
}

interface CompanyContent {
    logo_url?: string;
    hero_home_url?: string;
    hero_about_url?: string;
    about_us_text?: string;
    hero_overlay_text?: string;
    our_story_text?: string;
    about_image_1_url?: string;
    about_image_2_url?: string;
    about_image_3_url?: string;
}

interface Toast {
    type: 'success' | 'error';
    message: string;
}

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function PageManagementPage() {
    const { companyId, isAuthenticated, loading: authLoading } = useAdminAuth();
    const t = useT();

    // Content state
    const [content, setContent] = useState<CompanyContent>({});
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    // Text field state (for tracking changes)
    const [aboutUsText, setAboutUsText] = useState("");
    const [heroOverlayText, setHeroOverlayText] = useState("");
    const [ourStoryText, setOurStoryText] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Tab and Image State
    const [activeTab, setActiveTab] = useState("branding");
    const [pendingImages, setPendingImages] = useState<Record<string, File>>({});
    const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Fetch content and staff
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            const [contentRes, staffRes] = await Promise.all([
                fetch(getApiUrl(`/api/admin/company/${companyId}/content`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/staff?company_id=${companyId}`), {
                    credentials: "include",
                }),
            ]);

            if (contentRes.ok) {
                const contentData = await contentRes.json();
                const data = contentData.data || contentData;

                // Handle nested structure if present (images/texts keys)
                const images = data.images || {};
                const texts = data.texts || {};

                const flatContent: CompanyContent = {
                    ...data,
                    ...images,
                    ...texts,
                    // Map backend field names if different
                    hero_overlay_text: texts.about_us_hero_text || data.hero_overlay_text,
                    about_us_text: texts.about_us_text || data.about_us_text,
                    our_story_text: texts.our_story_text || data.our_story_text,

                    // Map Image Fields (Backend -> Frontend)
                    hero_home_url: images.home_hero_image_url || data.hero_home_url,
                    hero_about_url: images.about_hero_image_url || data.hero_about_url,

                    // Ensure other images are picked up
                    logo_url: images.logo_url || data.logo_url,
                    about_image_1_url: images.about_image_1_url || data.about_image_1_url,
                    about_image_2_url: images.about_image_2_url || data.about_image_2_url,
                    about_image_3_url: images.about_image_3_url || data.about_image_3_url,
                };

                setContent(flatContent);
                setAboutUsText(flatContent.about_us_text || "");
                setHeroOverlayText(flatContent.hero_overlay_text || "");
                setOurStoryText(flatContent.our_story_text || "");
            }

            if (staffRes.ok) {
                const staffData = await staffRes.json();
                setStaff(staffData.data || staffData || []);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setToast({ type: 'error', message: t('adminPages.failedToLoad') });
        } finally {
            setLoading(false);
        }
    }, [companyId, t]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Save all changes (text + images)
    const handleSave = async () => {
        if (!companyId) return;

        setSaving(true);
        try {
            // 1. Upload pending images first
            const uploadedUrls: Record<string, string> = {};

            // Upload company content images
            for (const [key, file] of Object.entries(pendingImages)) {
                if (key.startsWith('staff_')) continue;

                // Map frontend keys to backend types
                let type = key.replace('_url', '');
                // Fix specific mismatch for gallery images
                // about_image_1_url -> about_image_1 (wrong) -> about_1 (correct)
                if (type.startsWith('about_image_')) {
                    type = type.replace('about_image_', 'about_');
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('company_id', companyId.toString());
                formData.append('type', type);

                const res = await fetch(getApiUrl('/api/admin/uploads/image'), {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                });

                if (!res.ok) throw new Error(`Failed to upload ${key}`);
                const data = await res.json();
                uploadedUrls[key] = data.url || data.data?.url;
            }

            // Upload staff images
            const staffUpdates: Record<number, string> = {};
            for (const [key, file] of Object.entries(pendingImages)) {
                if (!key.startsWith('staff_')) continue;

                const staffId = parseInt(key.split('_')[1]);
                const formData = new FormData();
                formData.append('file', file);
                formData.append('company_id', companyId.toString());
                formData.append('type', 'staff');
                formData.append('entity_id', staffId.toString());

                const res = await fetch(getApiUrl('/api/admin/uploads/image'), {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                });

                if (!res.ok) throw new Error(`Failed to upload ${key}`);
                const data = await res.json();
                staffUpdates[staffId] = data.url || data.data?.url;
            }

            // 2. Save text content and company images
            const contentUpdates: Partial<CompanyContent> = {
                about_us_text: aboutUsText,
                hero_overlay_text: heroOverlayText,
                our_story_text: ourStoryText,
                ...uploadedUrls
            };

            const contentRes = await fetch(getApiUrl(`/api/admin/company/${companyId}/content`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(contentUpdates),
            });

            if (!contentRes.ok) throw new Error(t('adminPages.failedToSave'));

            // 3. Update local state
            setContent(prev => ({ ...prev, ...contentUpdates }));

            // Update staff state if needed
            if (Object.keys(staffUpdates).length > 0) {
                setStaff(prev => prev.map(s => staffUpdates[s.id] ? { ...s, image_url: staffUpdates[s.id] } : s));
            }

            setPendingImages({});
            setLocalPreviews({}); // Clear local previews, use real URLs now
            setHasUnsavedChanges(false);
            setToast({ type: 'success', message: t('adminPages.savedSuccess') });
        } catch (err) {
            console.error(err);
            setToast({ type: 'error', message: t('adminPages.failedToSave') });
        } finally {
            setSaving(false);
        }
    };

    // Handle image selection (local preview only)
    const handleImageSelect = (field: keyof CompanyContent) => (file: File) => {
        // Create local preview
        const objectUrl = URL.createObjectURL(file);

        setPendingImages(prev => ({ ...prev, [field]: file }));
        setLocalPreviews(prev => ({ ...prev, [field]: objectUrl }));
        setHasUnsavedChanges(true);
    };

    // Helper to get display URL (local preview > current backend URL)
    const getDisplayUrl = (field: keyof CompanyContent) => {
        return localPreviews[field] || content[field];
    };

    // Handle image delete
    const handleImageDelete = async (field: keyof CompanyContent) => {
        if (!companyId) return;

        try {
            const response = await fetch(getApiUrl(`/api/admin/company/${companyId}/content`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ [field]: null }),
            });

            if (!response.ok) throw new Error(t('adminPages.failedToDelete'));

            setContent(prev => ({ ...prev, [field]: undefined }));
            setToast({ type: 'success', message: t('adminPages.imageRemoved') });
        } catch {
            setToast({ type: 'error', message: t('adminPages.failedToDelete') });
        }
    };

    // Handle staff image selection
    const handleStaffImageSelect = (staffId: number) => (file: File) => {
        const key = `staff_${staffId}`;
        const objectUrl = URL.createObjectURL(file);

        setPendingImages(prev => ({ ...prev, [key]: file }));
        setLocalPreviews(prev => ({ ...prev, [key]: objectUrl }));
        setHasUnsavedChanges(true);
    };

    // Helper for staff image URL
    const getStaffDisplayUrl = (member: StaffMember) => {
        return localPreviews[`staff_${member.id}`] || member.image_url;
    };

    // Track text changes
    const handleTextChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setter(e.target.value);
            setHasUnsavedChanges(true);
        };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-slate-600">{t('adminPages.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('adminPages.title')}</h1>
                    <p className="text-slate-500">{t('adminPages.subtitle')}</p>
                </div>
                {hasUnsavedChanges && (
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {t('adminPages.saving')}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                {t('common.save')}
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${toast.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                    ) : (
                        <AlertCircle className="h-5 w-5" />
                    )}
                    {toast.message}
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="branding" className="gap-2">
                        <ImageIcon className="h-4 w-4 hidden sm:block" />
                        {t('adminPages.branding')}
                    </TabsTrigger>
                    <TabsTrigger value="home" className="gap-2">
                        <Home className="h-4 w-4 hidden sm:block" />
                        {t('adminPages.home')}
                    </TabsTrigger>
                    <TabsTrigger value="about" className="gap-2">
                        <Info className="h-4 w-4 hidden sm:block" />
                        {t('adminPages.about')}
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4 hidden sm:block" />
                        {t('adminPages.team')}
                    </TabsTrigger>
                </TabsList>

                {/* Branding Tab */}
                <TabsContent value="branding" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.logo')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.logoDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-sm">
                                <ImageUpload
                                    companyId={companyId!}
                                    type="logo"
                                    currentUrl={getDisplayUrl('logo_url')}
                                    autoUpload={false}
                                    onFileSelect={handleImageSelect('logo_url')}
                                    onDelete={() => handleImageDelete('logo_url')}
                                    aspectRatio="1:1"
                                    maxSizeMB={2}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Home Page Tab */}
                <TabsContent value="home" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.homeHero')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.homeHeroDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImageUpload
                                companyId={companyId!}
                                type="hero_home"
                                currentUrl={getDisplayUrl('hero_home_url')}
                                autoUpload={false}
                                onFileSelect={handleImageSelect('hero_home_url')}
                                onDelete={() => handleImageDelete('hero_home_url')}
                                aspectRatio="16:9"
                                maxSizeMB={5}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.aboutUs')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.aboutUsDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="about-us">{t('adminPages.aboutUsText')}</Label>
                                <textarea
                                    id="about-us"
                                    value={aboutUsText}
                                    onChange={handleTextChange(setAboutUsText)}
                                    placeholder={t('adminPages.aboutUsPlaceholder')}
                                    className="w-full h-32 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <p className="text-xs text-slate-500">
                                    {t('adminPages.aboutUsHelpText')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* About Page Tab */}
                <TabsContent value="about" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.aboutHero')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.aboutHeroDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ImageUpload
                                companyId={companyId!}
                                type="hero_about"
                                currentUrl={getDisplayUrl('hero_about_url')}
                                autoUpload={false}
                                onFileSelect={handleImageSelect('hero_about_url')}
                                onDelete={() => handleImageDelete('hero_about_url')}
                                aspectRatio="16:9"
                                maxSizeMB={5}
                            />

                            <div className="space-y-2">
                                <Label htmlFor="hero-overlay">{t('adminPages.overlayText')}</Label>
                                <textarea
                                    id="hero-overlay"
                                    value={heroOverlayText}
                                    onChange={handleTextChange(setHeroOverlayText)}
                                    placeholder={t('adminPages.overlayPlaceholder')}
                                    className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.ourStory')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.ourStoryDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="our-story">{t('adminPages.ourStoryText')}</Label>
                                <textarea
                                    id="our-story"
                                    value={ourStoryText}
                                    onChange={handleTextChange(setOurStoryText)}
                                    placeholder={t('adminPages.ourStoryPlaceholder')}
                                    className="w-full h-48 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.gallery')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.galleryDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <Label className="mb-2 block">{t('adminPages.imageNumber', { number: 1 })}</Label>
                                    <ImageUpload
                                        companyId={companyId!}
                                        type="about_1"
                                        currentUrl={getDisplayUrl('about_image_1_url')}
                                        autoUpload={false}
                                        onFileSelect={handleImageSelect('about_image_1_url')}
                                        onDelete={() => handleImageDelete('about_image_1_url')}
                                        aspectRatio="4:3"
                                        maxSizeMB={3}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block">{t('adminPages.imageNumber', { number: 2 })}</Label>
                                    <ImageUpload
                                        companyId={companyId!}
                                        type="about_2"
                                        currentUrl={getDisplayUrl('about_image_2_url')}
                                        autoUpload={false}
                                        onFileSelect={handleImageSelect('about_image_2_url')}
                                        onDelete={() => handleImageDelete('about_image_2_url')}
                                        aspectRatio="4:3"
                                        maxSizeMB={3}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block">{t('adminPages.imageNumber', { number: 3 })}</Label>
                                    <ImageUpload
                                        companyId={companyId!}
                                        type="about_3"
                                        currentUrl={getDisplayUrl('about_image_3_url')}
                                        autoUpload={false}
                                        onFileSelect={handleImageSelect('about_image_3_url')}
                                        onDelete={() => handleImageDelete('about_image_3_url')}
                                        aspectRatio="4:3"
                                        maxSizeMB={3}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Team Tab */}
                <TabsContent value="team" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('adminPages.teamPhotos')}</CardTitle>
                            <CardDescription>
                                {t('adminPages.teamPhotosDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {staff.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                    <p>{t('adminPages.noStaff')}</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {t('adminPages.noStaffDescription')}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {staff.map((member) => (
                                        <div
                                            key={member.id}
                                            className="border border-slate-200 rounded-xl p-4"
                                        >
                                            <div className="mb-4">
                                                <h3 className="font-semibold text-slate-900">
                                                    {member.display_name}
                                                </h3>
                                                <p className="text-sm text-slate-500">{member.role}</p>
                                            </div>
                                            <ImageUpload
                                                companyId={companyId!}
                                                type="staff"
                                                entityId={member.id}
                                                currentUrl={getStaffDisplayUrl(member)}
                                                autoUpload={false}
                                                onFileSelect={handleStaffImageSelect(member.id)}
                                                aspectRatio="1:1"
                                                maxSizeMB={2}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
