import type { BillingCycle, ShopPlan } from "./super-admin";

export interface SubscriptionHistoryActor {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string;
}

export interface ShopSubscriptionHistoryItem {
    id: number;
    companyId: number;
    previousPlan: ShopPlan | null;
    newPlan: ShopPlan;
    previousBillingCycle: BillingCycle | null;
    newBillingCycle: BillingCycle;
    previousPricePaid: string | null;
    newPricePaid: string | null;
    previousAvailableUntil: string | null;
    newAvailableUntil: string;
    previousMarketplaceVisible: boolean | null;
    newMarketplaceVisible: boolean;
    changedByUserId: string | null;
    changedBy: SubscriptionHistoryActor | null;
    changedAt: string;
    note: string | null;
}

export interface ShopSubscriptionSnapshot {
    id: number;
    name: string;
    plan: ShopPlan;
    billingCycle: BillingCycle;
    pricePaid: string | null;
    availableUntil: string;
    isMarketplaceVisible: boolean;
    isExpired: boolean;
}

export interface ShopSubscriptionHistoryPayload {
    company: ShopSubscriptionSnapshot;
    history: ShopSubscriptionHistoryItem[];
}
