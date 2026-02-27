"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LOCALE, getLocaleCookie, translate } from "@/lib/i18n";

export type AuthUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image?: string | null;
  phoneNumber?: string | null;
  phone_prefix?: string | null;
  is_super_admin?: boolean;
  emailVerified?: boolean;
  phoneNumberVerified?: boolean;
  [key: string]: unknown;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refreshSession: () => Promise<AuthUser | null>;

  // Email OTP login (clients)
  sendLoginEmailOtp: (email: string) => Promise<void>;
  verifyLoginEmailOtp: (email: string, code: string) => Promise<void>;

  // Phone OTP login (clients)
  sendPhoneOtp: (phoneNumber: string) => Promise<void>;
  verifyPhoneOtp: (phoneNumber: string, code: string) => Promise<void>;

  // Sign out
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  requestPhonePasswordReset: (phoneNumber: string) => Promise<void>;
  resetPhonePassword: (phoneNumber: string, code: string, newPassword: string) => Promise<void>;

  // Email registration (OTP, no password)
  startCustomerEmailRegistration: (email: string) => Promise<void>;
  verifyCustomerEmailCode: (email: string, code: string) => Promise<{ preRegToken: string }>;
  completeCustomerEmailRegistration: (
    preRegToken: string,
    email: string,
    first_name: string,
    last_name?: string,
  ) => Promise<void>;

  // Phone registration (Better Auth plugin)
  completeCustomerPhoneProfile: (
    first_name: string,
    last_name?: string,
    phone_prefix?: string,
  ) => Promise<void>;

  // Profile management
  updateProfile: (data: { first_name?: string; last_name?: string }) => Promise<void>;
  sendEmailChangeOtp: (newEmail: string) => Promise<void>;
  verifyEmailChange: (newEmail: string, code: string) => Promise<void>;
  sendPhoneChangeOtp: (newPhone: string) => Promise<void>;
  verifyPhoneChange: (newPhone: string, code: string, phone_prefix?: string) => Promise<void>;

  // Admin sign in (password-based, kept for admin/superadmin)
  signInWithEmail: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const extractUser = (payload: any): AuthUser | null => {
  if (!payload) return null;
  const candidate = payload.user ?? payload.session?.user ?? null;
  if (!candidate) return null;

  return {
    ...candidate,
    name: candidate.name ?? candidate.full_name ?? candidate.first_name ?? null,
    phoneNumber: candidate.phoneNumber ?? candidate.phone_number ?? null,
  };
};

const resolveApiUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";
  return `${base}${url}`;
};

const authT = (key: string, vars?: Record<string, string | number>) =>
  translate(getLocaleCookie() ?? DEFAULT_LOCALE, key, vars);

async function apiPost<TResponse>(
  url: string,
  body?: Record<string, unknown>,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(resolveApiUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      data?.details ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
}

async function apiGet<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(resolveApiUrl(url), {
    method: "GET",
    credentials: "include",
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
}

async function apiPut<TResponse>(url: string, body?: Record<string, unknown>): Promise<TResponse> {
  const response = await fetch(resolveApiUrl(url), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(resolveApiUrl("/auth/get-session"), {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || authT("authErrors.fetchSession"));
      }
      const currentUser = extractUser(data);
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.fetchSession");
      setError(message);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => {
    const intervalId = setInterval(() => { void refreshSession(); }, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [refreshSession]);
  useEffect(() => {
    const handleFocus = () => { void refreshSession(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshSession]);

  // ── Admin sign in (password-based) ──
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/auth/sign-in/email", { email, password });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.signIn");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  // ── Client email OTP login ──
  const sendLoginEmailOtp = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/v1/auth/customer/login/email/start", { email });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.sendOtp");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyLoginEmailOtp = useCallback(
    async (email: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/v1/auth/customer/login/email/verify", { email, code });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.verifyCode");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  // ── Phone OTP (login/register via Better Auth plugin) ──
  const sendPhoneOtp = useCallback(async (phoneNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/auth/phone-number/send-otp", { phoneNumber });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.sendOtp");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPhoneOtp = useCallback(
    async (phoneNumber: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/auth/phone-number/verify", { phoneNumber, code });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.verifyCode");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const origin =
        (typeof window !== "undefined" ? window.location.origin : null) ??
        process.env.NEXT_PUBLIC_FRONTEND_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "";

      const redirectTo = origin
        ? `${origin}/auth/reset-password`
        : "/auth/reset-password";

      await apiPost("/auth/forget-password", { email, redirectTo });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.requestPasswordReset");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/auth/reset-password", { token, newPassword });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.resetPassword");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPhonePasswordReset = useCallback(async (phoneNumber: string) => {
    void phoneNumber;
    const message = authT("authErrors.phoneResetNotSupported");
    setError(message);
    throw new Error(message);
  }, []);

  const resetPhonePassword = useCallback(
    async (phoneNumber: string, code: string, newPassword: string) => {
      void phoneNumber;
      void code;
      void newPassword;
      const message = authT("authErrors.phoneResetNotSupported");
      setError(message);
      throw new Error(message);
    },
    [],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await apiPost("/auth/sign-out");
      setUser(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.signOut");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Email registration (OTP, no password) ──
  const startCustomerEmailRegistration = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/v1/auth/customer/email/start", { email });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.startEmailRegistration");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyCustomerEmailCode = useCallback(
    async (email: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiPost<{ data?: { preRegToken: string }; preRegToken?: string }>(
          "/v1/auth/customer/email/verify",
          { email, code },
        );
        const preRegToken = response.data?.preRegToken ?? response.preRegToken ?? "";
        return { preRegToken };
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.verifyCode");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const completeCustomerEmailRegistration = useCallback(
    async (preRegToken: string, email: string, first_name: string, last_name?: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/v1/auth/customer/complete-email", {
          preRegToken,
          email,
          first_name,
          last_name,
        });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.completeRegistration");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const completeCustomerPhoneProfile = useCallback(
    async (first_name: string, last_name?: string, phone_prefix?: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/v1/auth/customer/complete-phone", { first_name, last_name, phone_prefix });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.completePhoneProfile");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  // ── Profile management ──
  const updateProfile = useCallback(
    async (data: { first_name?: string; last_name?: string }) => {
      setLoading(true);
      setError(null);
      try {
        await apiPut("/v1/auth/me", data);
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.updateProfile");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const sendEmailChangeOtp = useCallback(async (newEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/v1/auth/me/email/start", { email: newEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.sendVerification");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmailChange = useCallback(
    async (newEmail: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/v1/auth/me/email/verify", { email: newEmail, code });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.verifyEmailChange");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const sendPhoneChangeOtp = useCallback(async (newPhone: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/v1/auth/me/phone/start", { phoneNumber: newPhone });
    } catch (err) {
      const message = err instanceof Error ? err.message : authT("authErrors.sendVerification");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPhoneChange = useCallback(
    async (newPhone: string, code: string, phone_prefix?: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiPost("/v1/auth/me/phone/verify", { phoneNumber: newPhone, code, phone_prefix });
        await refreshSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : authT("authErrors.verifyPhoneChange");
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      refreshSession,
      signInWithEmail,
      sendLoginEmailOtp,
      verifyLoginEmailOtp,
      sendPhoneOtp,
      verifyPhoneOtp,
      requestPasswordReset,
      resetPassword,
      requestPhonePasswordReset,
      resetPhonePassword,
      signOut,
      startCustomerEmailRegistration,
      verifyCustomerEmailCode,
      completeCustomerEmailRegistration,
      completeCustomerPhoneProfile,
      updateProfile,
      sendEmailChangeOtp,
      verifyEmailChange,
      sendPhoneChangeOtp,
      verifyPhoneChange,
    }),
    [
      user,
      loading,
      error,
      refreshSession,
      signInWithEmail,
      sendLoginEmailOtp,
      verifyLoginEmailOtp,
      sendPhoneOtp,
      verifyPhoneOtp,
      requestPasswordReset,
      resetPassword,
      requestPhonePasswordReset,
      resetPhonePassword,
      signOut,
      startCustomerEmailRegistration,
      verifyCustomerEmailCode,
      completeCustomerEmailRegistration,
      completeCustomerPhoneProfile,
      updateProfile,
      sendEmailChangeOtp,
      verifyEmailChange,
      sendPhoneChangeOtp,
      verifyPhoneChange,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
