import SettingsPage from "../settings/page";

export default function BusinessSettingsPage() {
    return (
        <SettingsPage
            initialTab="booking"
            visibleTabs={["booking", "payments"]}
            titleKey="adminNav.settings"
            subtitleKey="adminSettings.businessSubtitle"
        />
    );
}
