import SettingsPage from "../settings/page";

const BUSINESS_SETTINGS_TABS = ["booking", "payments"] as const;

export default function BusinessSettingsPage() {
    return (
        <SettingsPage
            initialTab="booking"
            visibleTabs={BUSINESS_SETTINGS_TABS}
            titleKey="adminNav.settings"
            subtitleKey="adminSettings.businessSubtitle"
        />
    );
}
