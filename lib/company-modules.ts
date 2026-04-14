export type CompanyModules = {
    reservations: boolean;
    store: boolean;
};

export const DEFAULT_COMPANY_MODULES: CompanyModules = {
    reservations: true,
    store: false,
};

export function resolveCompanyModules(modules?: Partial<CompanyModules> | null): CompanyModules {
    return {
        reservations: modules?.reservations ?? DEFAULT_COMPANY_MODULES.reservations,
        store: modules?.store ?? DEFAULT_COMPANY_MODULES.store,
    };
}

export function isStoreOnlyCompany(modules?: Partial<CompanyModules> | null): boolean {
    const resolved = resolveCompanyModules(modules);
    return resolved.store && !resolved.reservations;
}
