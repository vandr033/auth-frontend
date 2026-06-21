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

type ComparableValue =
    | null
    | string
    | number
    | boolean
    | ComparableValue[]
    | { [key: string]: ComparableValue };

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object") return null;
    return value as Record<string, unknown>;
}

function normalizeComparableValue(value: unknown): ComparableValue | undefined {
    if (value == null) return null;
    if (
        typeof value === "string"
        || typeof value === "number"
        || typeof value === "boolean"
    ) {
        return value;
    }

    if (Array.isArray(value)) {
        const normalizedItems: ComparableValue[] = [];
        for (const item of value) {
            const normalizedItem = normalizeComparableValue(item);
            if (normalizedItem === undefined) return undefined;
            normalizedItems.push(normalizedItem);
        }
        return normalizedItems;
    }

    const record = toRecord(value);
    if (!record) return undefined;

    const normalizedRecord: Record<string, ComparableValue> = {};
    for (const key of Object.keys(record).sort()) {
        const normalizedEntry = normalizeComparableValue(record[key]);
        if (normalizedEntry !== undefined) {
            normalizedRecord[key] = normalizedEntry;
        }
    }

    return normalizedRecord;
}

function areComparableValuesEqual(left: ComparableValue, right: ComparableValue): boolean {
    if (left === right) return true;
    if (left == null || right == null) return left === right;
    if (typeof left !== typeof right) return false;

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right)) return false;
        if (left.length !== right.length) return false;
        return left.every((item, index) => areComparableValuesEqual(item, right[index]!));
    }

    if (typeof left === "object" && typeof right === "object") {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length) return false;
        return leftKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(right, key)
            && areComparableValuesEqual(left[key]!, right[key]!),
        );
    }

    return false;
}

function normalizeAdminUser(user: AdminUser | null): ComparableValue {
    if (!user) return null;

    const userRecord = toRecord(user) ?? {};

    return {
        id: normalizeComparableValue(userRecord.id) ?? null,
        email: normalizeComparableValue(userRecord.email) ?? null,
        name: normalizeComparableValue(userRecord.name) ?? null,
        image: normalizeComparableValue(userRecord.image) ?? null,
        first_name: normalizeComparableValue(userRecord.first_name ?? userRecord.firstName) ?? null,
        last_name: normalizeComparableValue(userRecord.last_name ?? userRecord.lastName) ?? null,
        is_super_admin: normalizeComparableValue(userRecord.is_super_admin ?? userRecord.isSuperAdmin) ?? null,
        must_change_password: normalizeComparableValue(
            userRecord.must_change_password ?? userRecord.mustChangePassword,
        ) ?? null,
    };
}

function normalizeCompany(company?: CompanyUser["company"] | null): ComparableValue {
    if (!company) return null;

    const companyRecord = toRecord(company) ?? {};

    return {
        id: normalizeComparableValue(companyRecord.id) ?? null,
        slug: normalizeComparableValue(companyRecord.slug) ?? null,
        name: normalizeComparableValue(companyRecord.name) ?? null,
        currency: normalizeComparableValue(companyRecord.currency) ?? null,
        default_language: normalizeComparableValue(
            companyRecord.default_language ?? companyRecord.defaultLanguage,
        ) ?? null,
        availableUntil: normalizeComparableValue(
            companyRecord.availableUntil ?? companyRecord.available_until,
        ) ?? null,
        plan: normalizeComparableValue(companyRecord.plan) ?? null,
        capabilities: normalizeComparableValue(companyRecord.capabilities) ?? null,
    };
}

function normalizeCompanyUser(companyUser: CompanyUser | null): ComparableValue {
    if (!companyUser) return null;

    const companyUserRecord = toRecord(companyUser) ?? {};

    return {
        id: normalizeComparableValue(companyUserRecord.id) ?? null,
        company_id: normalizeComparableValue(
            companyUserRecord.company_id ?? companyUserRecord.companyId,
        ) ?? null,
        user_id: normalizeComparableValue(companyUserRecord.user_id ?? companyUserRecord.userId) ?? null,
        role: normalizeComparableValue(companyUserRecord.role) ?? null,
        company: normalizeCompany((companyUserRecord.company as CompanyUser["company"] | undefined) ?? null),
    };
}

function normalizeCompanyUsers(companyUsers: CompanyUser[]): ComparableValue {
    return companyUsers.map((companyUser) => normalizeCompanyUser(companyUser));
}

function areAdminUsersEqual(left: AdminUser | null, right: AdminUser | null): boolean {
    return areComparableValuesEqual(normalizeAdminUser(left), normalizeAdminUser(right));
}

function areCompanyUsersEqual(left: CompanyUser[], right: CompanyUser[]): boolean {
    return areComparableValuesEqual(normalizeCompanyUsers(left), normalizeCompanyUsers(right));
}

function areCompanyUserRecordsEqual(left: CompanyUser | null, right: CompanyUser | null): boolean {
    return areComparableValuesEqual(normalizeCompanyUser(left), normalizeCompanyUser(right));
}

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

    const applySessionState = useCallback((nextState: {
        user: AdminUser | null;
        companyUsers: CompanyUser[];
        companyUser: CompanyUser | null;
        activeCompanyId: number | null;
    }) => {
        setUser((previousUser) =>
            areAdminUsersEqual(previousUser, nextState.user) ? previousUser : nextState.user,
        );
        setCompanyUsers((previousCompanyUsers) =>
            areCompanyUsersEqual(previousCompanyUsers, nextState.companyUsers)
                ? previousCompanyUsers
                : nextState.companyUsers,
        );
        setCompanyUser((previousCompanyUser) =>
            areCompanyUserRecordsEqual(previousCompanyUser, nextState.companyUser)
                ? previousCompanyUser
                : nextState.companyUser,
        );
        setActiveCompanyId((previousActiveCompanyId) =>
            previousActiveCompanyId === nextState.activeCompanyId
                ? previousActiveCompanyId
                : nextState.activeCompanyId,
        );
    }, []);

    const refreshSession = useCallback(async (background = false) => {
        if (!background) {
            setLoading((current) => (current ? current : true));
        }
        try {
            const response = await fetch(resolveApiUrl("/admin/auth/session"), {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.data?.user) {
                applySessionState({
                    user: null,
                    companyUsers: [],
                    companyUser: null,
                    activeCompanyId: null,
                });
                setError((previousError) => (previousError === null ? previousError : null));
                return;
            }

            const normalized = normalizeCompanyContext(data.data as SessionPayload);
            applySessionState({
                user: (data.data as SessionPayload).user ?? null,
                companyUsers: normalized.companyUsers,
                companyUser: normalized.activeCompanyUser,
                activeCompanyId: normalized.activeCompanyId,
            });
            setError((previousError) => (previousError === null ? previousError : null));
        } catch {
            applySessionState({
                user: null,
                companyUsers: [],
                companyUser: null,
                activeCompanyId: null,
            });
            setError((previousError) => (previousError === null ? previousError : null)); // Don't show error for session check
        } finally {
            if (!background) {
                setLoading((current) => (current ? false : current));
            }
        }
    }, [applySessionState]);

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

                const normalized = normalizeCompanyContext(result.data);
                applySessionState({
                    user: result.data.user,
                    companyUsers: normalized.companyUsers,
                    companyUser: normalized.activeCompanyUser,
                    activeCompanyId: normalized.activeCompanyId,
                });
                return { user: result.data.user, companyUser: result.data.companyUser ?? null };
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unable to sign in";
                setError(message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [applySessionState],
    );

    const signOut = useCallback(async () => {
        setLoading(true);
        try {
            await apiPost("/admin/auth/sign-out");
            applySessionState({
                user: null,
                companyUsers: [],
                companyUser: null,
                activeCompanyId: null,
            });
            setError((previousError) => (previousError === null ? previousError : null));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to sign out";
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [applySessionState]);

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

            applySessionState({
                user,
                companyUsers: normalized.companyUsers,
                companyUser: normalized.activeCompanyUser,
                activeCompanyId: normalized.activeCompanyId,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to switch shop";
            setError(message);
            throw err;
        } finally {
            setIsSwitchingShop(false);
        }
    }, [activeCompanyId, applySessionState, companyUsers, user]);

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
