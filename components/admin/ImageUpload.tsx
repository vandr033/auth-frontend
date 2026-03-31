"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getImageUrl, getUploadEndpoint, type CompanyImageType } from "@/utils/image-url";
import { useT } from "@/lib/i18n";

export type ImageUploadType = CompanyImageType | 'staff';

interface ImageUploadProps {
    companyId: number;
    type: ImageUploadType;
    entityId?: number;
    currentUrl?: string | null;
    autoUpload?: boolean;
    onUploadComplete?: (url: string) => void;
    onFileSelect?: (file: File) => void;
    onDelete?: () => void;
    aspectRatio?: '1:1' | '16:9' | '4:3' | 'free';
    maxSizeMB?: number;
    className?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

const aspectRatioClasses: Record<string, string> = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    'free': '',
};

const aspectRatioLabels: Record<string, string> = {
    '1:1': 'Square (1:1)',
    '16:9': 'Widescreen (16:9)',
    '4:3': 'Standard (4:3)',
    'free': 'Any ratio',
};

const recommendedSizesByType: Record<ImageUploadType, string> = {
    logo: "1080px x 1080px",
    hero_home: "1920px x 1080px",
    hero_about: "1920px x 1080px",
    about_1: "1600px x 1200px",
    about_2: "1600px x 1200px",
    about_3: "1600px x 1200px",
    qr: "1080px x 1080px",
    staff: "1080px x 1080px",
};

export function ImageUpload({
    companyId,
    type,
    entityId,
    currentUrl,
    onUploadComplete,
    onFileSelect,
    onDelete,
    aspectRatio = 'free',
    maxSizeMB = 5,
    autoUpload = true,
    className,
}: ImageUploadProps) {
    const t = useT();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recommendedSize = recommendedSizesByType[type];

    const displayUrl = previewUrl || getImageUrl(currentUrl);

    const validateFile = useCallback((file: File): string | null => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return t('imageUpload.invalidFileType');
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            return t('imageUpload.fileTooLarge', { maxSize: maxSizeMB });
        }
        return null;
    }, [maxSizeMB, t]);

    const uploadFile = useCallback(async (file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setIsUploading(true);
        setUploadProgress(0);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);

        try {
            const endpoint = getUploadEndpoint();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('company_id', companyId.toString());
            formData.append('type', type);
            if (type === 'staff' && entityId) {
                formData.append('entity_id', entityId.toString());
            }

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    setUploadProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            await new Promise<void>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            onUploadComplete?.(response.url || response.data?.url);
                            resolve();
                        } catch {
                            reject(new Error('Invalid response from server'));
                        }
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            reject(new Error(response.message || response.error || 'Upload failed'));
                        } catch {
                            reject(new Error('Upload failed'));
                        }
                    }
                };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.open('POST', endpoint);
                xhr.withCredentials = true;
                xhr.send(formData);
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [companyId, entityId, onUploadComplete, type, validateFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            if (autoUpload) {
                void uploadFile(file);
            } else {
                const validationError = validateFile(file);
                if (validationError) {
                    setError(validationError);
                    return;
                }
                setError(null);

                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => setPreviewUrl(e.target?.result as string);
                reader.readAsDataURL(file);

                onFileSelect?.(file);
            }
        }
    }, [autoUpload, onFileSelect, uploadFile, validateFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (autoUpload) {
                void uploadFile(file);
            } else {
                const validationError = validateFile(file);
                if (validationError) {
                    setError(validationError);
                    return;
                }
                setError(null);

                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => setPreviewUrl(e.target?.result as string);
                reader.readAsDataURL(file);

                onFileSelect?.(file);
            }
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleDelete = () => {
        setPreviewUrl(null);
        onDelete?.();
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={cn("w-full", className)}>
            {/* Current Image Preview */}
            {displayUrl && (
                <div className="relative mb-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <div className={cn("relative", aspectRatioClasses[aspectRatio] || 'min-h-[200px]')}>
                        <img
                            src={displayUrl}
                            alt={t('sharedUi.imagePreview')}
                            className="w-full h-full object-cover"
                        />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-center text-white">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    <p className="text-sm">{uploadProgress}%</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Zone */}
            <div
                onClick={openFilePicker}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isDragging
                        ? "border-orange-400 bg-orange-50"
                        : "border-slate-300 hover:border-orange-300 hover:bg-slate-50",
                    isUploading && "pointer-events-none opacity-50"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-2">
                    {isUploading ? (
                        <>
                            <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                            <p className="text-sm font-medium text-slate-700">{t('imageUpload.uploading', { progress: uploadProgress })}</p>
                        </>
                    ) : (
                        <>
                            <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
                                <Upload className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">
                                    {t('imageUpload.dragDrop')}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {t('imageUpload.fileTypes', { maxSize: maxSizeMB })}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {t('imageUpload.recommendedSize', { size: recommendedSize })}
                                </p>
                                {aspectRatio !== 'free' && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        {t('imageUpload.recommended', { ratio: aspectRatioLabels[aspectRatio] })}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                    <X className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 px-2 text-rose-600 hover:text-rose-700"
                        onClick={() => setError(null)}
                    >
                        {t('imageUpload.dismiss')}
                    </Button>
                </div>
            )}

            {/* Delete Button */}
            {displayUrl && onDelete && !isUploading && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="mt-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('adminPages.removeImage')}
                </Button>
            )}
        </div>
    );
}
