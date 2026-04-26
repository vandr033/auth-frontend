export const STOREFRONT_SECTIONS = [
    { id: "content", label: "storefrontBuilder.content" },
    { id: "appearance", label: "adminTheme.visualStyle" },
    { id: "actions", label: "adminTheme.buttonsCtas" },
    { id: "sections", label: "storefrontBuilder.sections" },
    { id: "media", label: "storefrontBuilder.media" },
    { id: "business", label: "storefrontBuilder.businessInfo" },
] as const;

export type StorefrontSection = (typeof STOREFRONT_SECTIONS)[number]["id"];

export const DEFAULT_STOREFRONT_SECTION: StorefrontSection = "content";

export function isStorefrontSection(value: string): value is StorefrontSection {
    return STOREFRONT_SECTIONS.some((section) => section.id === value);
}
