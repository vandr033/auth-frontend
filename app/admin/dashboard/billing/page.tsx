import SettingsPage from "../settings/page";

const BILLING_TABS = ["subscription"] as const;

export default function BillingPage() {
    return (
        <SettingsPage
            initialTab="subscription"
            visibleTabs={BILLING_TABS}
            titleKey="adminNav.planBilling"
            subtitleKey="adminSettings.billingSubtitle"
        />
    );
}
