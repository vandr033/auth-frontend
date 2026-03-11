"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_OTP_RESEND_COOLDOWN_SECONDS = 60;

export function getOtpResendCooldownSeconds() {
    const rawValue = Number(process.env.NEXT_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS || DEFAULT_OTP_RESEND_COOLDOWN_SECONDS);
    if (!Number.isFinite(rawValue)) return DEFAULT_OTP_RESEND_COOLDOWN_SECONDS;
    const normalized = Math.trunc(rawValue);
    return Math.max(1, normalized);
}

export function useOtpResendTimer(initialSeconds = getOtpResendCooldownSeconds()) {
    const [secondsRemaining, setSecondsRemaining] = useState(0);

    useEffect(() => {
        if (secondsRemaining <= 0) return;

        const interval = window.setInterval(() => {
            setSecondsRemaining((previous) => (previous > 0 ? previous - 1 : 0));
        }, 1000);

        return () => window.clearInterval(interval);
    }, [secondsRemaining]);

    const startCooldown = useCallback((seconds?: number) => {
        const next = Math.max(1, Math.trunc(seconds || initialSeconds));
        setSecondsRemaining(next);
    }, [initialSeconds]);

    const resetCooldown = useCallback(() => {
        setSecondsRemaining(0);
    }, []);

    const canResend = useMemo(() => secondsRemaining <= 0, [secondsRemaining]);

    return {
        secondsRemaining,
        canResend,
        startCooldown,
        resetCooldown,
    };
}
