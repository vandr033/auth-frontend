import type {
    ActiveCommercialProduct,
    BillingCycle,
    RequestedCommercialProduct,
    ShopPlan,
} from "./super-admin";
import type {
    ProductAccessRequestSource,
    ProductAccessRequestStatus,
} from "./product-access";

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
    legacyPlanCompatibility: ShopPlan;
    billingCycle: BillingCycle;
    pricePaid: string | null;
    availableUntil: string;
    isMarketplaceVisible: boolean;
    isExpired: boolean;
    activeProducts: ActiveCommercialProduct[];
    requestedProducts: RequestedCommercialProduct[];
}

export interface ShopProductHistoryItem {
    id: number;
    companyId: number;
    action: string;
    previousValue: unknown;
    newValue: unknown;
    actorUserId: string | null;
    actor: SubscriptionHistoryActor | null;
    createdAt: string;
    timestamp: string;
    note: string | null;
    source: string | null;
    productCode: string | null;
    previousTier: string | null;
    newTier: string | null;
    previousStatus: string | null;
    newStatus: string | null;
    previousAvailableUntil: string | null;
    newAvailableUntil: string | null;
    pricePaid: string | null;
    billingCycle: string | null;
}

export interface ShopPendingProductRequestItem {
    id: number;
    productCode: string;
    productName: string;
    tierCode: string;
    tierName: string;
    capability: string;
    status: ProductAccessRequestStatus;
    source: ProductAccessRequestSource;
    message: string | null;
    createdAt: string;
    requestedByUserId: string;
    requestedBy: SubscriptionHistoryActor | null;
}

export interface ShopSubscriptionHistoryPayload {
    company: ShopSubscriptionSnapshot;
    history: ShopSubscriptionHistoryItem[];
    productHistory: ShopProductHistoryItem[];
    pendingRequests: ShopPendingProductRequestItem[];
}
