import type { DemoProfileKey } from "./catalog";

type DemoLaunchResponse = {
    data?: {
        isDemo?: boolean;
        profile?: {
            adminDestination?: unknown;
        };
    };
    message?: string;
};

export async function requestDemoLaunch(
    profile: DemoProfileKey,
    destination?: string,
    fetcher: typeof fetch = fetch,
): Promise<string> {
    const response = await fetcher("/demo/launch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
    });
    const payload = await response.json().catch(() => null) as DemoLaunchResponse | null;
    if (!response.ok) throw new Error(payload?.message || "No pudimos iniciar la demostración.");
    if (payload?.data?.isDemo !== true || payload.data.profile === undefined) {
        throw new Error("No pudimos confirmar el inicio de la demostración.");
    }

    const adminDestination = destination ?? payload?.data?.profile?.adminDestination;
    if (
        typeof adminDestination !== "string" ||
        !(adminDestination === "/admin/dashboard" || adminDestination.startsWith("/admin/dashboard/"))
    ) {
        throw new Error("No encontramos el destino del panel para esta demostración.");
    }
    return adminDestination;
}
