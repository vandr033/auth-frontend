"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AuthUser } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  Edit2,
  Check,
  X,
  Loader2,
  Shield,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OtpFlow = null | "email" | "phone";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user: sessionUser,
    loading: authLoading,
    isAuthenticated,
    updateProfile,
    sendEmailChangeOtp,
    verifyEmailChange,
    sendPhoneChangeOtp,
    verifyPhoneChange,
  } = useAuth();
  const api = useApi();

  // Full profile data fetched from our API (includes first_name, last_name, etc.)
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Editing state
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // OTP modal state
  const [otpFlow, setOtpFlow] = useState<OtpFlow>(null);
  const [newContactValue, setNewContactValue] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Status
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch full profile from our /v1/auth/me endpoint
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const result = await api.get<{ data: { user: AuthUser } }>("/v1/auth/me");
      setProfile(result.data?.user ?? null);
    } catch {
      // Fall back to session user
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  // The user object: prefer full profile data, fall back to session
  const user = profile ?? sessionUser;

  // Initialize form values when profile loads
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name as string || "");
      setLastName(user.last_name as string || "");
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/sign-in?redirect=/me/profile");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) return null;

  const initials =
    (user.first_name?.[0] || user.name?.[0] || "U") +
    (user.last_name?.[0] || "");

  // ── Name save ──
  const handleNameSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ first_name: firstName, last_name: lastName });
      await fetchProfile();
      setEditingName(false);
      setStatus("Name updated successfully.");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  // ── OTP handlers ──
  const handleStartOtp = (type: "email" | "phone") => {
    setOtpFlow(type);
    setNewContactValue("");
    setOtpCode("");
    setOtpSent(false);
    setError(null);
    setStatus(null);
  };

  const handleSendOtp = async () => {
    setSaving(true);
    setError(null);
    try {
      if (otpFlow === "email") {
        await sendEmailChangeOtp(newContactValue);
        setStatus("Verification code sent to your new email.");
      } else {
        await sendPhoneChangeOtp(newContactValue);
        setStatus("Verification code sent via WhatsApp.");
      }
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
    setSaving(true);
    setError(null);
    try {
      if (otpFlow === "email") {
        await verifyEmailChange(newContactValue, otpCode);
        setStatus("Email updated successfully!");
      } else {
        await verifyPhoneChange(newContactValue, otpCode);
        setStatus("Phone number updated successfully!");
      }
      setOtpFlow(null);
      await fetchProfile();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOtp = () => {
    setOtpFlow(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-5">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
            <AvatarImage src={user.image as string | undefined} />
            <AvatarFallback className="bg-brand text-white text-2xl font-bold">
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {user.name || "My Profile"}
            </h1>
            <p className="text-slate-500">Manage your account details</p>
          </div>
        </div>

        {/* Status/Error messages */}
        {(status || error) && (
          <div
            className={cn(
              "mb-6 rounded-lg border px-4 py-3 text-sm",
              status && !error
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            {error || status}
          </div>
        )}

        {/* Name Section */}
        <Card className="mb-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-brand" />
              Name
            </CardTitle>
            {!editingName ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingName(true)}
                className="text-brand hover:text-brand-hover"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingName(false);
                    setFirstName(user.first_name || "");
                    setLastName(user.last_name || "");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleNameSave}
                  disabled={saving || !firstName}
                  className="bg-brand text-white hover:bg-brand-hover"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editingName ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">First name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Last name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <p className="text-slate-900 font-medium">
                {user.first_name || ""} {user.last_name || ""}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Email Section */}
        <Card className="mb-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-brand" />
              Email
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStartOtp("email")}
              className="text-brand hover:text-brand-hover"
            >
              {user.email ? (
                <>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Change
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add email
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {user.email ? (
              <div className="flex items-center gap-2">
                <p className="text-slate-900">{user.email}</p>
                {user.emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    <Shield className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic">No email address set</p>
            )}
          </CardContent>
        </Card>

        {/* Phone Section */}
        <Card className="mb-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-brand" />
              Phone
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStartOtp("phone")}
              className="text-brand hover:text-brand-hover"
            >
              {user.phoneNumber ? (
                <>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Change
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add phone
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {user.phoneNumber ? (
              <div className="flex items-center gap-2">
                <p className="text-slate-900">
                  {user.phone_prefix ? `+${user.phone_prefix} ` : ""}
                  {user.phoneNumber}
                </p>
                {user.phoneNumberVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    <Shield className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic">No phone number set</p>
            )}
          </CardContent>
        </Card>

        {/* OTP Verification Modal */}
        {otpFlow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {otpFlow === "email"
                    ? "Change email address"
                    : "Change phone number"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label>
                        {otpFlow === "email"
                          ? "New email address"
                          : "New phone number"}
                      </Label>
                      <Input
                        type={otpFlow === "email" ? "email" : "tel"}
                        placeholder={
                          otpFlow === "email"
                            ? "new@example.com"
                            : "+1234567890"
                        }
                        value={newContactValue}
                        onChange={(e) => setNewContactValue(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {otpFlow === "email"
                        ? "We'll send a verification code to this email."
                        : "We'll send a verification code via WhatsApp."}
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Verification code</Label>
                    <Input
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Code sent to <strong>{newContactValue}</strong>
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-rose-600">{error}</p>
                )}

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleCancelOtp}>
                    Cancel
                  </Button>
                  {!otpSent ? (
                    <Button
                      onClick={handleSendOtp}
                      disabled={saving || !newContactValue}
                      className="bg-brand text-white hover:bg-brand-hover"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      Send code
                    </Button>
                  ) : (
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={saving || !otpCode}
                      className="bg-brand text-white hover:bg-brand-hover"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      Verify & update
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
