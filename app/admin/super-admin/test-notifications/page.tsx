"use client";

import { FormEvent, useState } from "react";
import { Loader2, Mail, MessageCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

interface ApiResponse {
    code?: number;
    error?: boolean;
    message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getApiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export default function SuperAdminTestNotificationsPage() {
    const t = useT();

    const [email, setEmail] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [whatsappMessage, setWhatsappMessage] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

    const handleSendTestEmail = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const targetEmail = email.trim();
        if (!targetEmail) {
            void notify.warning(t("superAdminTestNotifications.emailRequired"));
            return;
        }

        if (!EMAIL_REGEX.test(targetEmail)) {
            void notify.warning(t("superAdminTestNotifications.emailInvalid"));
            return;
        }

        setSendingEmail(true);
        try {
            const response = await fetch(getApiUrl("/api/super-admin/notifications/test/email"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: targetEmail,
                    subject: emailSubject.trim() || undefined,
                    message: emailMessage.trim() || undefined,
                }),
            });

            const payload = (await response.json().catch(() => ({}))) as ApiResponse;
            if (!response.ok || payload.error) {
                throw new Error(payload.message || t("superAdminTestNotifications.sendEmailFailed"));
            }

            void notify.success(payload.message || t("superAdminTestNotifications.sendEmailSuccess"));
        } catch (error) {
            void notify.error(
                error instanceof Error ? error.message : t("superAdminTestNotifications.sendEmailFailed"),
            );
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendTestWhatsapp = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const targetPhone = phoneNumber.trim();
        if (!targetPhone) {
            void notify.warning(t("superAdminTestNotifications.phoneRequired"));
            return;
        }

        setSendingWhatsapp(true);
        try {
            const response = await fetch(getApiUrl("/api/super-admin/notifications/test/whatsapp"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    phoneNumber: targetPhone,
                    message: whatsappMessage.trim() || undefined,
                }),
            });

            const payload = (await response.json().catch(() => ({}))) as ApiResponse;
            if (!response.ok || payload.error) {
                throw new Error(payload.message || t("superAdminTestNotifications.sendWhatsappFailed"));
            }

            void notify.success(payload.message || t("superAdminTestNotifications.sendWhatsappSuccess"));
        } catch (error) {
            void notify.error(
                error instanceof Error ? error.message : t("superAdminTestNotifications.sendWhatsappFailed"),
            );
        } finally {
            setSendingWhatsapp(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("superAdminTestNotifications.title")}</h1>
                <p className="text-slate-500">{t("superAdminTestNotifications.subtitle")}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Mail className="h-4 w-4 text-admin-brand" />
                            {t("superAdminTestNotifications.emailCardTitle")}
                        </CardTitle>
                        <CardDescription>{t("superAdminTestNotifications.emailCardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSendTestEmail}>
                            <div className="space-y-2">
                                <Label htmlFor="test-email">{t("superAdminTestNotifications.emailLabel")}</Label>
                                <Input
                                    id="test-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder={t("superAdminTestNotifications.emailPlaceholder")}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="test-email-subject">{t("superAdminTestNotifications.subjectLabel")}</Label>
                                <Input
                                    id="test-email-subject"
                                    value={emailSubject}
                                    onChange={(event) => setEmailSubject(event.target.value)}
                                    placeholder={t("superAdminTestNotifications.subjectPlaceholder")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="test-email-message">{t("superAdminTestNotifications.messageLabel")}</Label>
                                <Input
                                    id="test-email-message"
                                    value={emailMessage}
                                    onChange={(event) => setEmailMessage(event.target.value)}
                                    placeholder={t("superAdminTestNotifications.messagePlaceholder")}
                                />
                            </div>

                            <Button type="submit" disabled={sendingEmail} className="w-full">
                                {sendingEmail ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("superAdminTestNotifications.sendingEmail")}
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        {t("superAdminTestNotifications.sendEmail")}
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageCircle className="h-4 w-4 text-admin-brand" />
                            {t("superAdminTestNotifications.whatsappCardTitle")}
                        </CardTitle>
                        <CardDescription>{t("superAdminTestNotifications.whatsappCardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSendTestWhatsapp}>
                            <div className="space-y-2">
                                <Label htmlFor="test-whatsapp">{t("superAdminTestNotifications.phoneLabel")}</Label>
                                <Input
                                    id="test-whatsapp"
                                    value={phoneNumber}
                                    onChange={(event) => setPhoneNumber(event.target.value)}
                                    placeholder={t("superAdminTestNotifications.phonePlaceholder")}
                                    required
                                />
                                <p className="text-xs text-slate-500">{t("superAdminTestNotifications.phoneHint")}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="test-whatsapp-message">{t("superAdminTestNotifications.messageLabel")}</Label>
                                <Input
                                    id="test-whatsapp-message"
                                    value={whatsappMessage}
                                    onChange={(event) => setWhatsappMessage(event.target.value)}
                                    placeholder={t("superAdminTestNotifications.messagePlaceholder")}
                                />
                            </div>

                            <Button type="submit" disabled={sendingWhatsapp} className="w-full">
                                {sendingWhatsapp ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("superAdminTestNotifications.sendingWhatsapp")}
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        {t("superAdminTestNotifications.sendWhatsapp")}
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
