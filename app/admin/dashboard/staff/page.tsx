"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    User,
    Mail,
    Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { getImageUrl, getStaffImageUrl } from "@/utils/image-url";

// Types
// Types
interface Service {
    id: number;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number | string;
    is_active: boolean;
}

interface Staff {
    id: number;
    user_id: string;
    company_id: number;
    display_name: string;
    bio: string | null;
    image_url: string | null;
    is_bookable: boolean;
    is_active: boolean;
    services?: number[]; // IDs of services this staff member can perform
    user?: {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
    };
}

interface StaffFormData {
    email: string;
    display_name: string;
    bio: string;
    is_bookable: boolean;
    service_ids: number[];
}

const initialFormData: StaffFormData = {
    email: "",
    display_name: "",
    bio: "",
    is_bookable: true,
    service_ids: [],
};

// Helper function to get initials
function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function StaffPage() {
    const { companyId, isAuthenticated, loading: authLoading } = useAdminAuth();

    // State
    const [staff, setStaff] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]); // New state for services
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState<StaffFormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);


    // Fetch staff and services
    const fetchData = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const [staffRes, servicesRes] = await Promise.all([
                fetch(getApiUrl(`/api/admin/staff?company_id=${companyId}`), {
                    credentials: "include",
                }),
                fetch(getApiUrl(`/api/admin/services?company_id=${companyId}`), {
                    credentials: "include",
                }),
            ]);

            if (!staffRes.ok) throw new Error("Failed to fetch staff");
            // Don't fail hard if services fail, just provide empty list
            // if (!servicesRes.ok) throw new Error("Failed to fetch services");

            const staffData = await staffRes.json();
            const servicesData = servicesRes.ok ? await servicesRes.json() : { data: [] };

            setStaff(staffData.data || staffData || []);
            setServices(servicesData.data || servicesData || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (isAuthenticated && companyId) {
            void fetchData();
        }
    }, [isAuthenticated, companyId, fetchData]);

    // Filtered staff
    const filteredStaff = staff.filter((member) =>
        member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Open modal for add/edit
    const openAddModal = () => {
        setEditingStaff(null);
        setFormData(initialFormData);
        setFormError(null);
        setSelectedImage(null);
        setPreviewImage(null);
        setIsModalOpen(true);
    };

    const openEditModal = (member: Staff) => {
        setEditingStaff(member);
        setFormData({
            email: member.user?.email || "",
            display_name: member.display_name,
            bio: member.bio || "",
            is_bookable: member.is_bookable,
            service_ids: member.services || [], // Prefill services
        });
        setFormError(null);
        setSelectedImage(null);
        setPreviewImage(member.image_url || null);
        setIsModalOpen(true);
    };

    // Helper to toggle a service in the list
    const toggleService = (serviceId: number) => {
        setFormData(prev => ({
            ...prev,
            service_ids: prev.service_ids.includes(serviceId)
                ? prev.service_ids.filter(id => id !== serviceId)
                : [...prev.service_ids, serviceId]
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;

        // Validation
        if (!formData.display_name.trim()) {
            setFormError("Display name is required");
            return;
        }
        if (!editingStaff && !formData.email.trim()) {
            setFormError("Email is required to invite staff");
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            // STEP 1: Create or Update Staff Basic Info
            const payload = {
                display_name: formData.display_name.trim(),
                bio: formData.bio.trim() || null,
                is_bookable: formData.is_bookable,
                company_id: companyId,
                ...(editingStaff ? {} : { email: formData.email.trim(), service_ids: formData.service_ids }),
            };

            const url = editingStaff
                ? getApiUrl(`/api/admin/staff/${editingStaff.id}`)
                : getApiUrl("/api/admin/staff");

            const response = await fetch(url, {
                method: editingStaff ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || "Failed to save staff");
            }

            const savedStaff = await response.json();
            const staffId = savedStaff.data?.id || savedStaff.id;

            // STEP 2: Update Services (Only for Edit)
            // For Create, it's sent in the payload above.
            if (editingStaff) {
                const servicesRes = await fetch(getApiUrl(`/api/admin/staff/${staffId}/services`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ service_ids: formData.service_ids }),
                });

                if (!servicesRes.ok) {
                    console.error("Failed to update staff services");
                }
            }

            // STEP 3: Handle Image Upload if selected
            if (selectedImage && staffId) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedImage);
                imageFormData.append('company_id', companyId.toString());
                imageFormData.append('type', 'staff');
                imageFormData.append('entity_id', staffId.toString());

                const uploadRes = await fetch(getApiUrl('/api/admin/uploads/image'), {
                    method: 'POST',
                    body: imageFormData,
                    credentials: 'include',
                });

                if (!uploadRes.ok) {
                    // Don't fail the whole operation, just warn
                    console.error("Failed to upload staff image");
                    // You might want to show a warning toast here
                }
            }

            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to save staff");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingStaff) return;

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl(`/api/admin/staff/${deletingStaff.id}`), {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) throw new Error("Failed to delete staff");

            setIsDeleteDialogOpen(false);
            setDeletingStaff(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete staff");
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle bookable status
    const toggleBookable = async (member: Staff) => {
        try {
            const response = await fetch(getApiUrl(`/api/admin/staff/${member.id}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ is_bookable: !member.is_bookable }),
            });

            if (!response.ok) throw new Error("Failed to update status");

            setStaff((prev) =>
                prev.map((s) =>
                    s.id === member.id ? { ...s, is_bookable: !s.is_bookable } : s
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status");
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-slate-600">Loading staff...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
                    <p className="text-slate-500">Manage your team members</p>
                </div>
                <Button onClick={openAddModal} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                </Button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-2"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Staff Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.length === 0 ? (
                    <Card className="sm:col-span-2 lg:col-span-3">
                        <CardContent className="py-12 text-center text-slate-500">
                            {searchQuery ? "No staff match your search" : "No staff yet. Add your first team member!"}
                        </CardContent>
                    </Card>
                ) : (
                    filteredStaff.map((member) => (
                        <Card key={member.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                {/* Card Header with Photo */}
                                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 flex items-center gap-4">
                                    {member.image_url ? (
                                        <img
                                            src={getImageUrl(member.image_url) || ""}
                                            alt={member.display_name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-semibold border-2 border-white/30">
                                            {getInitials(member.display_name)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate">
                                            {member.display_name}
                                        </h3>
                                        {member.user?.email && (
                                            <p className="text-white/80 text-sm truncate flex items-center gap-1">
                                                <Mail className="h-3 w-3 flex-shrink-0" />
                                                {member.user.email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-4">
                                    {/* Bio Preview */}
                                    {member.bio ? (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {member.bio}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">
                                            No bio provided
                                        </p>
                                    )}

                                    {/* Bookable Toggle */}
                                    <div className="flex items-center justify-between py-2 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm text-slate-600">Bookable</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "text-xs font-medium",
                                                    member.is_bookable ? "text-emerald-600" : "text-slate-400"
                                                )}
                                            >
                                                {member.is_bookable ? "Yes" : "No"}
                                            </span>
                                            <Switch
                                                checked={member.is_bookable}
                                                onCheckedChange={() => toggleBookable(member)}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(member)}
                                            className="flex-1"
                                        >
                                            <Pencil className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingStaff(member);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Add/Edit Staff Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStaff
                                ? `Edit ${editingStaff.display_name}`
                                : "Add New Staff Member"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingStaff
                                ? "Update the staff member's details below"
                                : "Invite a new team member by email"}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                                {formError}
                            </div>
                        )}

                        {/* Email - only for new staff */}
                        {!editingStaff && (
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="staff@example.com"
                                />
                                <p className="text-xs text-slate-500">
                                    An invitation will be sent to this email address
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="display_name">Display Name *</Label>
                            <Input
                                id="display_name"
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="e.g., John Smith"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Brief description or specialty..."
                                className="w-full h-24 px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        {/* Service Selection */}
                        <div className="space-y-2">
                            <Label>Assigned Services</Label>
                            {services.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">No services available. Create services first.</p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {services.map(service => (
                                        <label key={service.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.service_ids.includes(service.id)}
                                                onChange={() => toggleService(service.id)}
                                                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-sm text-slate-700">{service.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-2">
                            <Label>Photo</Label>
                            <div className="max-w-xs mx-auto sm:mx-0">
                                <ImageUpload
                                    companyId={companyId!}
                                    type="staff"
                                    currentUrl={previewImage}
                                    autoUpload={false}
                                    onFileSelect={(file) => {
                                        setSelectedImage(file);
                                        setPreviewImage(URL.createObjectURL(file));
                                    }}
                                    aspectRatio="1:1"
                                    maxSizeMB={2}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Label htmlFor="is_bookable">Bookable</Label>
                                <p className="text-xs text-slate-500">
                                    Staff can receive bookings from customers
                                </p>
                            </div>
                            <Switch
                                id="is_bookable"
                                checked={formData.is_bookable}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_bookable: checked })
                                }
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : editingStaff ? (
                                    "Update Staff"
                                ) : (
                                    "Add Staff"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Remove Staff Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove &quot;{deletingStaff?.display_name}&quot; from your team? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setDeletingStaff(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={submitting}
                            className="bg-rose-500 hover:bg-rose-600"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Removing...
                                </>
                            ) : (
                                "Remove Staff"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
