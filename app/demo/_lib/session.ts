export function isDemoSession(value: unknown): value is { isDemo: true } {
    return Boolean(value && typeof value === "object" && "isDemo" in value && value.isDemo === true);
}

export function demoActionMessage(errorCode: string | undefined): string | undefined {
    if (errorCode === "DEMO_READ_ONLY") return "Esta acción no está disponible en modo demo.";
    if (errorCode === "DEMO_SESSION_EXPIRED") return "La sesión de demostración venció. Inicia otra demostración.";
    return undefined;
}
