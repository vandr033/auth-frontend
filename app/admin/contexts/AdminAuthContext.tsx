"use client";

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
    };
};

type AdminAuthContextValue = {
    user: AdminUser | null;
    companyUser: CompanyUser | null;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    companyId: number | null;
    companySlug: string | null;
    companyName: string | null;
    role: string | null;
    refreshSession: (background?: boolean) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ user: AdminUser; companyUser: CompanyUser | null }>;
    signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const resolveApiUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "";
    return `${base}${url}`;
};

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
        const message = String(
            data?.error ?? data?.message ?? `Request failed with status ${response.status}`
        );
        throw new Error(message);
    }

    return data as TResponse;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshSession = useCallback(async (background = false) => {
        if (!background) setLoading(true);
        try {
            const response = await fetch(resolveApiUrl("/admin/auth/session"), {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.data?.user) {
                setUser(null);
                setCompanyUser(null);
                setError(null);
                return;
            }

            setUser(data.data.user);
            setCompanyUser(data.data.companyUser);
            setError(null);
        } catch {
            setUser(null);
            setCompanyUser(null);
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
                    data: { user: AdminUser; companyUser: CompanyUser };
                }>("/admin/auth/sign-in", { email, password });

                setUser(result.data.user);
                setCompanyUser(result.data.companyUser);
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
            setCompanyUser(null);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to sign out";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const value = useMemo<AdminAuthContextValue>(
        () => ({
            user,
            companyUser,
            loading,
            error,
            // Super admins can be authenticated without a companyUser
            isAuthenticated: Boolean(user && (companyUser || user.is_super_admin)),
            isSuperAdmin: Boolean(user?.is_super_admin),
            companyId: companyUser?.company_id ?? null,
            companySlug: companyUser?.company?.slug ?? null,
            companyName: companyUser?.company?.name ?? null,
            role: companyUser?.role ?? null,
            refreshSession,
            signIn,
            signOut,
        }),
        [user, companyUser, loading, error, refreshSession, signIn, signOut],
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
