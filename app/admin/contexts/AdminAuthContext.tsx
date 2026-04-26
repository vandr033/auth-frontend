"use client";

import { resolveApiUrl } from "@/lib/api-url";
import type { CompanyCapabilities } from "@/lib/plans/capabilities";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type AdminUser = {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    is_super_admin?: boolean;
    must_change_password?: boolean;
};

export type CompanyUser = {
    id: number;
    company_id: number;
    user_id: string;
    role: "OWNER" | "ADMIN" | "STAFF" | "CUSTOMER";
    company?: {
        id: number;
        slug: string;
        name: string;
        currency?: string;
        default_language?: string;
        availableUntil?: string;
        plan?: "STARTER" | "BUSINESS" | "PRO";
        capabilities?: CompanyCapabilities | null;
    };
};

type SessionPayload = {
    user?: AdminUser | null;
    companyUser?: CompanyUser | null;
    companyUsers?: CompanyUser[];
    activeCompanyId?: number | null;
};

function normalizeCompanyContext(payload?: SessionPayload | null) {
    const companyUsers = Array.isArray(payload?.companyUsers)
        ? payload?.companyUsers ?? []
        : payload?.companyUser
            ? [payload.companyUser]
            : [];

    const activeCompanyId =
        typeof payload?.activeCompanyId === "number"
            ? payload.activeCompanyId
            : payload?.companyUser?.company_id ?? null;

    const activeCompanyUser = activeCompanyId
        ? companyUsers.find((companyUser) => companyUser.company_id === activeCompanyId) ?? null
        : payload?.companyUser ?? companyUsers[0] ?? null;

    return {
        companyUsers,
        activeCompanyId: activeCompanyUser?.company_id ?? activeCompanyId ?? null,
        activeCompanyUser,
    };
}

type AdminAuthContextValue = {
    user: AdminUser | null;
    companyUsers: CompanyUser[];
    companyUser: CompanyUser | null;
    activeCompanyId: number | null;
    isSwitchingShop: boolean;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    mustChangePassword: boolean;
    companyId: number | null;
    companySlug: string | null;
    companyName: string | null;
    role: string | null;
    refreshSession: (background?: boolean) => Promise<void>;
    switchActiveShop: (companyId: number) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ user: AdminUser; companyUser: CompanyUser | null }>;
    signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

async function apiPost<TResponse>(
    url: string,
    body?: Record<string, unknown>,
): Promise<TResponse> {
    const response = await fetch(resolveApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });

    let data: Record<string, unknown> | null = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            (typeof data?.message === "string" && data.message.trim()) ||
            (typeof data?.error === "string" && data.error.trim()) ||
            (typeof data?.technicalMessage === "string" && data.technicalMessage.trim()) ||
            `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return data as TResponse;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
    const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
    const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
    const [isSwitchingShop, setIsSwitchingShop] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshSession = useCallback(async (background = false) => {
        if (!background) setLoading(true);
        try {
            const response = await fetch(resolveApiUrl("/admin/auth/session"), {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.data?.user) {
                setUser(null);
                setCompanyUsers([]);
                setCompanyUser(null);
                setActiveCompanyId(null);
                setError(null);
                return;
            }

            const normalized = normalizeCompanyContext(data.data as SessionPayload);
            setUser((data.data as SessionPayload).user ?? null);
            setCompanyUsers(normalized.companyUsers);
            setCompanyUser(normalized.activeCompanyUser);
            setActiveCompanyId(normalized.activeCompanyId);
            setError(null);
        } catch {
            setUser(null);
            setCompanyUsers([]);
            setCompanyUser(null);
            setActiveCompanyId(null);
            setError(null); // Don't show error for session check
        } finally {
            if (!background) setLoading(false);
        }
    }, []);

    // Initial session check
    useEffect(() => {
        void refreshSession();
    }, [refreshSession]);

    // Periodic session refresh to keep session alive (every 2 minutes)
    useEffect(() => {
        const intervalId = setInterval(() => {
            void refreshSession(true);
        }, 2 * 60 * 1000); // 2 minutes

        return () => clearInterval(intervalId);
    }, [refreshSession]);

    // Refresh session when window regains focus
    useEffect(() => {
        const handleFocus = () => {
            void refreshSession(true);
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [refreshSession]);

    const signIn = useCallback(
        async (email: string, password: string) => {
            setLoading(true);
            setError(null);
            try {
                const result = await apiPost<{
                    data: {
                        user: AdminUser;
                        companyUser: CompanyUser | null;
                        companyUsers?: CompanyUser[];
                        activeCompanyId?: number | null;
                    };
                }>("/admin/auth/sign-in", { email, password });

                setUser(result.data.user);
                const normalized = normalizeCompanyContext(result.data);
                setCompanyUsers(normalized.companyUsers);
                setCompanyUser(normalized.activeCompanyUser);
                setActiveCompanyId(normalized.activeCompanyId);
                return { user: result.data.user, companyUser: result.data.companyUser ?? null };
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unable to sign in";
                setError(message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const signOut = useCallback(async () => {
        setLoading(true);
        try {
            await apiPost("/admin/auth/sign-out");
            setUser(null);
            setCompanyUsers([]);
            setCompanyUser(null);
            setActiveCompanyId(null);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to sign out";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const switchActiveShop = useCallback(async (companyId: number) => {
        if (!companyId || companyId === activeCompanyId) return;

        setIsSwitchingShop(true);
        setError(null);
        try {
            const result = await apiPost<{
                data?: {
                    companyUser?: CompanyUser | null;
                    companyUsers?: CompanyUser[];
                    activeCompanyId?: number | null;
                };
            }>("/admin/auth/active-shop", { company_id: companyId });

            const normalized = normalizeCompanyContext({
                companyUser: result.data?.companyUser ?? null,
                companyUsers: result.data?.companyUsers ?? companyUsers,
                activeCompanyId: result.data?.activeCompanyId ?? companyId,
            });

            setCompanyUsers(normalized.companyUsers);
            setCompanyUser(normalized.activeCompanyUser);
            setActiveCompanyId(normalized.activeCompanyId);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to switch shop";
            setError(message);
            throw err;
        } finally {
            setIsSwitchingShop(false);
        }
    }, [activeCompanyId, companyUsers]);

    const value = useMemo<AdminAuthContextValue>(
        () => ({
            user,
            companyUsers,
            companyUser,
            activeCompanyId,
            isSwitchingShop,
            loading,
            error,
            // Super admins can be authenticated without a companyUser
            isAuthenticated: Boolean(user && (companyUser || user.is_super_admin)),
            isSuperAdmin: Boolean(user?.is_super_admin),
            mustChangePassword: Boolean(user?.must_change_password),
            companyId: companyUser?.company_id ?? null,
            companySlug: companyUser?.company?.slug ?? null,
            companyName: companyUser?.company?.name ?? null,
            role: companyUser?.role ?? null,
            refreshSession,
            switchActiveShop,
            signIn,
            signOut,
        }),
        [
            user,
            companyUsers,
            companyUser,
            activeCompanyId,
            isSwitchingShop,
            loading,
            error,
            refreshSession,
            switchActiveShop,
            signIn,
            signOut,
        ],
    );

    return (
        <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
