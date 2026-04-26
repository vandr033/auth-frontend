import SettingsPage from "../settings/page";

export default function BillingPage() {
    return (
        <SettingsPage
            initialTab="subscription"
            visibleTabs={["subscription"]}
            titleKey="adminNav.planBilling"
            subtitleKey="adminSettings.billingSubtitle"
        />
    );
}
