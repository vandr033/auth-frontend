'use client';

import { useMemo } from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const getErrorMessage = (data: unknown, status: number): string => {
  if (typeof data === "object" && data !== null) {
    const payload = data as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string" && payload.error) return payload.error;
    if (typeof payload.message === "string" && payload.message) return payload.message;
  }
  return `Request failed with status ${status}`;
};

const resolveApiUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";
  return `${base}${url}`;
};

async function request<TResponse>(
  method: HttpMethod,
  url: string,
  body?: Record<string, unknown>,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(resolveApiUrl(url), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    body: body && method !== "GET" ? JSON.stringify(body) : undefined,
    ...init,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, response.status));
  }

  return data as TResponse;
}

/**
 * Simple API hook for client components. Resolves URLs using NEXT_PUBLIC_API_BASE_URL/NEXT_PUBLIC_BACKEND_URL.
 */
export function useApi() {
  return useMemo(
    () => ({
      get: <T = unknown>(url: string, init?: RequestInit) =>
        request<T>("GET", url, undefined, init),
      post: <T = unknown>(url: string, body?: Record<string, unknown>, init?: RequestInit) =>
        request<T>("POST", url, body, init),
      put: <T = unknown>(url: string, body?: Record<string, unknown>, init?: RequestInit) =>
        request<T>("PUT", url, body, init),
      patch: <T = unknown>(url: string, body?: Record<string, unknown>, init?: RequestInit) =>
        request<T>("PATCH", url, body, init),
      del: <T = unknown>(url: string, init?: RequestInit) =>
        request<T>("DELETE", url, undefined, init),
    }),
    [],
  );
}
