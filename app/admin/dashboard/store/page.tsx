"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Package, Store, Truck } from "lucide-react";

import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { uploadAdminImage } from "@/app/admin/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFixedCurrencyFromCents, parseCurrencyInputToCents } from "@/lib/currency";
import { notify } from "@/lib/notify";
import { useT } from "@/lib/i18n";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { getImageUrl } from "@/utils/image-url";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";

type CommerceSettings = {
    store_enabled: boolean;
    currency: string;
    supports_pickup: boolean;
    supports_delivery: boolean;
    qr_payment_enabled: boolean;
    qr_image_url?: string | null;
    support_phone?: string | null;
    asap_orders_enabled: boolean;
    scheduled_orders_enabled: boolean;
    hero_title?: string | null;
    hero_subtitle?: string | null;
    banner_image_url?: string | null;
};

type CommerceCategory = {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    is_active: boolean;
};

type CommerceProduct = {
    id: number;
    category_id: number | null;
    name: string;
    description?: string | null;
    regular_price_cents: number;
    promotional_price_cents?: number | null;
    promo_valid_from?: string | null;
    promo_valid_until?: string | null;
    promotion_active?: boolean;
    effective_price_cents?: number;
    stock_quantity: number;
    is_active: boolean;
    is_featured: boolean;
    is_combo: boolean;
    images?: Array<{ image_url: string }>;
};

type CommercePointOfSale = {
    id: number;
    name: string;
    city: string;
    osm_link?: string | null;
    opening_hours_text?: string | null;
    support_phone?: string | null;
    pickup_enabled: boolean;
    delivery_enabled: boolean;
    is_active: boolean;
};

type CommerceWindow = {
    id?: number;
    label: string;
    start_time?: string | null;
    end_time?: string | null;
};

type CommerceDeliveryRule = {
    id?: number;
    weekday: number;
    delivery_enabled: boolean;
    asap_enabled: boolean;
    scheduled_enabled: boolean;
    windows: CommerceWindow[];
};

type CommerceOrder = {
    id: number;
    guest_name: string;
    guest_phone_prefix?: string | null;
    guest_phone?: string | null;
    guest_email?: string | null;
    fulfillment_type: string;
    order_type: string;
    status: string;
    payment_status?: "UNPAID" | "PENDING_CONFIRMATION" | "PAID" | "REJECTED";
    total_cents: number;
    delivery_address?: string | null;
    delivery_instructions?: string | null;
    scheduled_date?: string | null;
    scheduled_timeframe?: string | null;
    tracking_link?: string | null;
    support_phone_snapshot?: string | null;
    notes?: string | null;
    internal_notes?: string | null;
    point_of_sale?: { id: number; name: string; city: string } | null;
    assigned_staff?: { id: number; display_name: string } | null;
    items?: Array<{
        id: number;
        product_name_snapshot: string;
        quantity: number;
        subtotal_cents: number;
    }>;
};

type StaffMember = {
    id: number;
    display_name: string;
};

type BootstrapPayload = {
    settings: CommerceSettings;
    categories: CommerceCategory[];
    products: CommerceProduct[];
    points_of_sale: CommercePointOfSale[];
    delivery_rules: CommerceDeliveryRule[];
    delivery_rules_source?: "explicit" | "company_hours";
};

const ADMIN_STATUSES = ["ASSIGNED", "IN_PROCESS", "READY", "SENT", "DELIVERED", "CANCELLED"];
const STAFF_STATUSES = ["IN_PROCESS", "READY", "SENT", "DELIVERED"];
const ADMIN_PAYMENT_STATUSES = ["PENDING_CONFIRMATION", "PAID", "REJECTED"] as const;

function getApiUrl(path: string): string {
    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:3001/api";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    return `${base}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

const emptySettings: CommerceSettings = {
    store_enabled: false,
    currency: "Bs.",
    supports_pickup: true,
    supports_delivery: false,
    qr_payment_enabled: true,
    qr_image_url: "",
    support_phone: "",
    asap_orders_enabled: true,
    scheduled_orders_enabled: false,
    hero_title: "",
    hero_subtitle: "",
    banner_image_url: "",
};

const emptyCategory = { name: "", is_active: true };
const emptyProduct = {
    category_id: "",
    name: "",
    description: "",
    regular_price: "0.00",
    promotional_price: "",
    promo_schedule_enabled: false,
    promo_valid_from: "",
    promo_valid_until: "",
    stock_quantity: "0",
    is_active: true,
    is_featured: false,
    is_combo: false,
    images: [] as string[],
};
const emptyPoint = {
    name: "",
    city: "",
    osm_link: "",
    opening_hours_text: "",
    support_phone: "",
    pickup_enabled: true,
    delivery_enabled: false,
    is_active: true,
};

function defaultRules(): CommerceDeliveryRule[] {
    return Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        delivery_enabled: false,
        asap_enabled: false,
        scheduled_enabled: false,
        windows: [],
    }));
}

function formatAdminPriceInput(cents?: number | null): string {
    if (cents === null || cents === undefined) return "";
    return (cents / 100).toFixed(2);
}

function formatPromoRange(start?: string | null, end?: string | null, locale?: string) {
    if (!start && !end) return null;

    const parts = [start, end]
        .filter(Boolean)
        .map((value) =>
            new Date(value as string).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
            }),
        );

    return parts.join(" - ");
}

export default function AdminStorePage() {
    const t = useT();
    const { companyId, companyUser, user, isAuthenticated, loading: authLoading } = useAdminAuth();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const canUseStoreModule = Boolean(user?.is_super_admin) || canUsePlanFeature(plan, "STORE_MODULE");
    const isStaffOnly = companyUser?.role === "STAFF";

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<CommerceSettings>(emptySettings);
    const [categories, setCategories] = useState<CommerceCategory[]>([]);
    const [products, setProducts] = useState<CommerceProduct[]>([]);
    const [pointsOfSale, setPointsOfSale] = useState<CommercePointOfSale[]>([]);
    const [deliveryRules, setDeliveryRules] = useState<CommerceDeliveryRule[]>(defaultRules());
    const [savedDeliveryRules, setSavedDeliveryRules] = useState<CommerceDeliveryRule[]>(defaultRules());
    const [deliveryRulesSource, setDeliveryRulesSource] = useState<"explicit" | "company_hours">("company_hours");
    const [orders, setOrders] = useState<CommerceOrder[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<CommerceOrder | null>(null);
    const [activeTab, setActiveTab] = useState(isStaffOnly ? "orders" : "settings");
    const [saving, setSaving] = useState(false);

    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [categoryForm, setCategoryForm] = useState(emptyCategory);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [productForm, setProductForm] = useState(emptyProduct);
    const [editingPointId, setEditingPointId] = useState<number | null>(null);
    const [pointForm, setPointForm] = useState(emptyPoint);
    const [orderStatusDraft, setOrderStatusDraft] = useState<string>("");
    const [paymentStatusDraft, setPaymentStatusDraft] = useState<string>("PENDING_CONFIRMATION");
    const [trackingDraft, setTrackingDraft] = useState("");
    const [assignedStaffDraft, setAssignedStaffDraft] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const currency = settings.currency || companyUser?.company?.currency;
    const formatMoney = useCallback(
        (cents: number) => formatFixedCurrencyFromCents(cents, currency),
        [currency],
    );

    const isDeliveryRulesDirty = useMemo(
        () => JSON.stringify(deliveryRules) !== JSON.stringify(savedDeliveryRules),
        [deliveryRules, savedDeliveryRules],
    );

    const getOrderStatusLabel = useCallback(
        (status: string) => t(`adminStore.orderStatuses.${status}`),
        [t],
    );
    const getPaymentStatusLabel = useCallback(
        (status: string) => t(`adminStore.paymentStatuses.${status}`),
        [t],
    );
    const getFulfillmentLabel = useCallback(
        (value: string) => t(`adminStore.fulfillmentTypes.${value}`),
        [t],
    );
    const getOrderTypeLabel = useCallback(
        (value: string) => t(`adminStore.orderTypes.${value}`),
        [t],
    );

    const fetchOrders = useCallback(async () => {
        const path = isStaffOnly ? "/api/admin/commerce/staff/orders" : "/api/admin/commerce/orders";
        const url = new URL(getApiUrl(path));
        if (statusFilter) {
            url.searchParams.set("status", statusFilter);
        }

        const response = await fetch(url.toString(), { credentials: "include" });
        const result = await response.json();
        if (!response.ok || result.error) {
            throw new Error(result.message || t("adminStore.errors.loadOrders"));
        }
        setOrders(result.data || []);
    }, [isStaffOnly, statusFilter, t]);

    const fetchBootstrap = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            if (isStaffOnly) {
                await fetchOrders();
                setLoading(false);
                return;
            }

            const [bootstrapRes, staffRes] = await Promise.all([
                fetch(getApiUrl("/api/admin/commerce/bootstrap"), { credentials: "include" }),
                fetch(getApiUrl("/api/admin/staff"), { credentials: "include" }),
            ]);

            const bootstrapJson = await bootstrapRes.json();
            if (!bootstrapRes.ok || bootstrapJson.error) {
                throw new Error(bootstrapJson.message || t("adminStore.errors.loadBootstrap"));
            }

            const data = (bootstrapJson.data || {}) as BootstrapPayload;
            setSettings({ ...emptySettings, ...data.settings });
            setCategories(data.categories || []);
            setProducts(data.products || []);
            setPointsOfSale(data.points_of_sale || []);
            const loadedRules = data.delivery_rules && data.delivery_rules.length > 0 ? data.delivery_rules : defaultRules();
            setDeliveryRules(loadedRules);
            setSavedDeliveryRules(loadedRules);
            setDeliveryRulesSource(data.delivery_rules_source || "company_hours");

            if (staffRes.ok) {
                const staffJson = await staffRes.json();
                const staffData = (staffJson.data || staffJson || []) as Array<{ id: number; display_name: string }>;
                setStaffMembers(staffData.map((item) => ({ id: item.id, display_name: item.display_name })));
            }

            await fetchOrders();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.loadBootstrap"));
        } finally {
            setLoading(false);
        }
    }, [companyId, fetchOrders, isStaffOnly, t]);

    useEffect(() => {
        if (isAuthenticated && companyId && canUseStoreModule) {
            void fetchBootstrap();
        } else if (!canUseStoreModule) {
            setLoading(false);
        }
    }, [canUseStoreModule, companyId, fetchBootstrap, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && companyId && canUseStoreModule) {
            void fetchOrders();
        }
    }, [canUseStoreModule, companyId, fetchOrders, isAuthenticated]);

    useEffect(() => {
        if (!isDeliveryRulesDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDeliveryRulesDirty]);

    useEffect(() => {
        if (!isDeliveryRulesDirty || activeTab !== "rules") return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                void saveDeliveryRules();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
        // saveDeliveryRules is defined below but stable across renders
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDeliveryRulesDirty, activeTab]);

    const visibleOrders = useMemo(() => orders, [orders]);

    async function saveSettings() {
        setSaving(true);
        try {
            const {
                store_enabled: _storeEnabled,
                ...settingsPayload
            } = settings;
            const response = await fetch(getApiUrl("/api/admin/commerce/settings"), {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settingsPayload),
            });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.saveSettings"));
            setSettings((prev) => ({ ...prev, ...result.data }));
            await notify.success(t("adminStore.feedback.settingsSaved"));
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.saveSettings"));
        } finally {
            setSaving(false);
        }
    }

    async function submitCategory() {
        setSaving(true);
        try {
            const isEditing = Boolean(editingCategoryId);
            const response = await fetch(
                getApiUrl(
                    isEditing
                        ? `/api/admin/commerce/categories/${editingCategoryId}`
                        : "/api/admin/commerce/categories",
                ),
                {
                    method: isEditing ? "PUT" : "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(categoryForm),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.saveCategory"));
            await notify.success(
                isEditing ? t("adminStore.feedback.categoryUpdated") : t("adminStore.feedback.categoryCreated"),
            );
            setCategoryForm(emptyCategory);
            setEditingCategoryId(null);
            await fetchBootstrap();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.saveCategory"));
        } finally {
            setSaving(false);
        }
    }

    async function moveCategory(categoryId: number, direction: "up" | "down") {
        try {
            const response = await fetch(
                getApiUrl(`/api/admin/commerce/categories/${categoryId}/move`),
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ direction }),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.message || t("adminStore.errors.reorderCategory"));
            }
            setCategories(result.data || []);
        } catch (error) {
            await notify.error(
                error instanceof Error ? error.message : t("adminStore.errors.reorderCategory"),
            );
        }
    }

    async function uploadProductImages(files: FileList | File[] | null) {
        if (!companyId || !files || files.length === 0) return;
        setSaving(true);
        try {
            const uploadedUrls = await Promise.all(
                Array.from(files).map((file) =>
                    uploadAdminImage({
                        file,
                        companyId,
                        type: "commerce_product",
                    }),
                ),
            );

            setProductForm((prev) => ({
                ...prev,
                images: [...prev.images, ...uploadedUrls],
            }));
            await notify.success(t("adminStore.feedback.productImagesUploaded"));
        } catch (error) {
            await notify.error(
                error instanceof Error ? error.message : t("adminStore.errors.uploadProductImages"),
            );
        } finally {
            setSaving(false);
        }
    }

    async function submitProduct() {
        const regularPriceCents = parseCurrencyInputToCents(productForm.regular_price);
        const promotionalPriceCents = productForm.promotional_price
            ? parseCurrencyInputToCents(productForm.promotional_price)
            : null;
        const stockQuantity = Number.parseInt(productForm.stock_quantity, 10);

        if (regularPriceCents === null) {
            await notify.error(t("adminStore.errors.invalidRegularPrice"));
            return;
        }

        if (productForm.promotional_price && promotionalPriceCents === null) {
            await notify.error(t("adminStore.errors.invalidPromoPrice"));
            return;
        }

        if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
            await notify.error(t("adminStore.errors.invalidStock"));
            return;
        }

        setSaving(true);
        try {
            const isEditing = Boolean(editingProductId);
            const response = await fetch(
                getApiUrl(
                    isEditing ? `/api/admin/commerce/products/${editingProductId}` : "/api/admin/commerce/products",
                ),
                {
                    method: isEditing ? "PUT" : "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        category_id: productForm.category_id ? Number(productForm.category_id) : null,
                        name: productForm.name,
                        description: productForm.description,
                        regular_price_cents: regularPriceCents,
                        promotional_price_cents: promotionalPriceCents,
                        promo_valid_from:
                            productForm.promo_schedule_enabled && productForm.promo_valid_from
                                ? productForm.promo_valid_from
                                : null,
                        promo_valid_until:
                            productForm.promo_schedule_enabled && productForm.promo_valid_until
                                ? productForm.promo_valid_until
                                : null,
                        stock_quantity: stockQuantity,
                        images: productForm.images,
                        is_active: productForm.is_active,
                        is_featured: productForm.is_featured,
                        is_combo: productForm.is_combo,
                    }),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.saveProduct"));
            await notify.success(
                isEditing ? t("adminStore.feedback.productUpdated") : t("adminStore.feedback.productCreated"),
            );
            setProductForm(emptyProduct);
            setEditingProductId(null);
            await fetchBootstrap();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.saveProduct"));
        } finally {
            setSaving(false);
        }
    }

    async function submitPointOfSale() {
        setSaving(true);
        try {
            const isEditing = Boolean(editingPointId);
            const response = await fetch(
                getApiUrl(
                    isEditing
                        ? `/api/admin/commerce/points-of-sale/${editingPointId}`
                        : "/api/admin/commerce/points-of-sale",
                ),
                {
                    method: isEditing ? "PUT" : "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(pointForm),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.savePointOfSale"));
            await notify.success(
                isEditing ? t("adminStore.feedback.pointUpdated") : t("adminStore.feedback.pointCreated"),
            );
            setPointForm(emptyPoint);
            setEditingPointId(null);
            await fetchBootstrap();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.savePointOfSale"));
        } finally {
            setSaving(false);
        }
    }

    async function saveDeliveryRules() {
        setSaving(true);
        try {
            const response = await fetch(getApiUrl("/api/admin/commerce/delivery-rules"), {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rules: deliveryRules }),
            });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.saveDeliveryRules"));
            const savedRules = result.data?.rules || [];
            setDeliveryRules(savedRules);
            setSavedDeliveryRules(savedRules);
            setDeliveryRulesSource(result.data?.source || "explicit");
            await notify.success(t("adminStore.feedback.deliveryRulesSaved"));
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.saveDeliveryRules"));
        } finally {
            setSaving(false);
        }
    }

    async function resetDeliveryRulesToStoreHours() {
        setSaving(true);
        try {
            const response = await fetch(getApiUrl("/api/admin/commerce/delivery-rules"), {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rules: [] }),
            });
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.message || t("adminStore.errors.resetDeliveryRules"));
            }
            const resetRules = result.data?.rules || defaultRules();
            setDeliveryRules(resetRules);
            setSavedDeliveryRules(resetRules);
            setDeliveryRulesSource(result.data?.source || "company_hours");
            await notify.success(t("adminStore.feedback.deliveryRulesReset"));
        } catch (error) {
            await notify.error(
                error instanceof Error ? error.message : t("adminStore.errors.resetDeliveryRules"),
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteEntity(path: string, message: string) {
        try {
            const response = await fetch(getApiUrl(path), {
                method: "DELETE",
                credentials: "include",
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.deleteItem"));
            await notify.success(message);
            await fetchBootstrap();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.deleteItem"));
        }
    }

    async function openOrderDetail(orderId: number) {
        try {
            const path = isStaffOnly
                ? `/api/admin/commerce/staff/orders/${orderId}`
                : `/api/admin/commerce/orders/${orderId}`;
            const response = await fetch(getApiUrl(path), { credentials: "include" });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.loadOrder"));
            setSelectedOrder(result.data);
            setOrderStatusDraft(result.data.status);
            setPaymentStatusDraft(result.data.payment_status || "PENDING_CONFIRMATION");
            setTrackingDraft(result.data.tracking_link || "");
            setAssignedStaffDraft(result.data.assigned_staff?.id ? String(result.data.assigned_staff.id) : "");
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.loadOrder"));
        }
    }

    async function assignSelectedOrder() {
        if (!selectedOrder || !assignedStaffDraft) return;
        try {
            const response = await fetch(
                getApiUrl(`/api/admin/commerce/orders/${selectedOrder.id}/assign`),
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ staff_id: Number(assignedStaffDraft) }),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.assignOrder"));
            await notify.success(t("adminStore.feedback.orderAssigned"));
            await openOrderDetail(selectedOrder.id);
            await fetchOrders();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.assignOrder"));
        }
    }

    async function updateSelectedOrderStatus() {
        if (!selectedOrder) return;
        const path = isStaffOnly
            ? `/api/admin/commerce/staff/orders/${selectedOrder.id}/status`
            : `/api/admin/commerce/orders/${selectedOrder.id}/status`;
        try {
            const response = await fetch(getApiUrl(path), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: orderStatusDraft,
                    tracking_link: trackingDraft || null,
                }),
            });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.updateOrder"));
            await notify.success(t("adminStore.feedback.orderUpdated"));
            await openOrderDetail(selectedOrder.id);
            await fetchOrders();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.updateOrder"));
        }
    }

    async function updateTrackingLink() {
        if (!selectedOrder || isStaffOnly) return;
        try {
            const response = await fetch(
                getApiUrl(`/api/admin/commerce/orders/${selectedOrder.id}/tracking`),
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tracking_link: trackingDraft }),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.updateTracking"));
            await notify.success(t("adminStore.feedback.trackingSaved"));
            await openOrderDetail(selectedOrder.id);
            await fetchOrders();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.updateTracking"));
        }
    }

    async function updatePaymentStatus() {
        if (!selectedOrder || isStaffOnly) return;
        try {
            const response = await fetch(
                getApiUrl(`/api/admin/commerce/orders/${selectedOrder.id}/payment-status`),
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payment_status: paymentStatusDraft }),
                },
            );
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.message || t("adminStore.errors.updatePayment"));
            await notify.success(t("adminStore.feedback.paymentUpdated"));
            await openOrderDetail(selectedOrder.id);
            await fetchOrders();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminStore.errors.updatePayment"));
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    if (!canUseStoreModule) {
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={t("planEnforcement.availableOnBusiness")}
                feature="STORE_MODULE"
                className="max-w-3xl"
            />
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                            {t("adminStore.storefront")}
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            {isStaffOnly ? t("adminStore.assignedOrdersTitle") : t("adminStore.title")}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            {isStaffOnly
                                ? t("adminStore.assignedOrdersSubtitle")
                                : t("adminStore.subtitle")}
                        </p>
                    </div>
                    {!isStaffOnly ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <div className="grid grid-cols-3 gap-px">
                                <div className="flex items-center gap-2 bg-white px-3 py-2.5">
                                    <Store className="h-4 w-4 shrink-0 text-brand" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("adminStore.storeLabel")}</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {settings.store_enabled ? t("adminStore.enabled") : t("adminStore.disabled")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-2.5">
                                    <Package className="h-4 w-4 shrink-0 text-brand" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("adminStore.productsTab")}</p>
                                        <p className="text-sm font-semibold text-slate-900">{products.length}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-2.5">
                                    <Truck className="h-4 w-4 shrink-0 text-brand" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("adminStore.ordersTab")}</p>
                                        <p className="text-sm font-semibold text-slate-900">{orders.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-md border bg-white p-1">
                        {!isStaffOnly ? <TabsTrigger value="settings">{t("adminStore.settingsTab")}</TabsTrigger> : null}
                        {!isStaffOnly ? <TabsTrigger value="categories">{t("adminStore.categoriesTab")}</TabsTrigger> : null}
                        {!isStaffOnly ? <TabsTrigger value="products">{t("adminStore.productsTab")}</TabsTrigger> : null}
                        {!isStaffOnly ? <TabsTrigger value="points">{t("adminStore.pointsTab")}</TabsTrigger> : null}
                        {!isStaffOnly ? <TabsTrigger value="rules">{t("adminStore.deliveryRulesTab")}</TabsTrigger> : null}
                        <TabsTrigger value="orders">{t("adminStore.ordersTab")}</TabsTrigger>
                    </TabsList>

                    {!isStaffOnly ? (
                        <TabsContent value="settings" className="mt-6">
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle>{t("adminStore.settingsTitle")}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 lg:grid-cols-2">
                                    <div className="overflow-hidden rounded-xl border border-slate-200">
                                        <div className="bg-slate-50 px-4 py-3">
                                            <p className="font-medium text-slate-900">{t("adminStore.storeModuleTitle")}</p>
                                            <p className="text-sm text-slate-500">
                                                {settings.store_enabled
                                                    ? t("adminStore.storeEnabledBySuperAdmin")
                                                    : t("adminStore.storeDisabledBySuperAdmin")}
                                            </p>
                                        </div>
                                        <div className="divide-y divide-slate-100 bg-white">
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-900">{t("adminStore.supportPickup")}</p>
                                                    <p className="text-sm text-slate-500">{t("adminStore.supportPickupDesc")}</p>
                                                </div>
                                                <Switch checked={settings.supports_pickup} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, supports_pickup: value }))} />
                                            </div>
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-900">{t("adminStore.supportDelivery")}</p>
                                                    <p className="text-sm text-slate-500">{t("adminStore.supportDeliveryDesc")}</p>
                                                </div>
                                                <Switch checked={settings.supports_delivery} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, supports_delivery: value }))} />
                                            </div>
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <p className="font-medium text-slate-900">{t("adminStore.allowAsapOrders")}</p>
                                                <Switch checked={settings.asap_orders_enabled} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, asap_orders_enabled: value }))} />
                                            </div>
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <p className="font-medium text-slate-900">{t("adminStore.allowScheduledOrders")}</p>
                                                <Switch checked={settings.scheduled_orders_enabled} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, scheduled_orders_enabled: value }))} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.storeTitle")}</Label>
                                            <Input value={settings.hero_title || ""} onChange={(event) => setSettings((prev) => ({ ...prev, hero_title: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.storeSubtitle")}</Label>
                                            <textarea className="min-h-[90px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={settings.hero_subtitle || ""} onChange={(event) => setSettings((prev) => ({ ...prev, hero_subtitle: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.currencyLabel")}</Label>
                                            <Input
                                                value={settings.currency || ""}
                                                maxLength={3}
                                                onChange={(event) => setSettings((prev) => ({ ...prev, currency: event.target.value }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.bannerImage")}</Label>
                                            <ImageUpload
                                                companyId={companyId || 0}
                                                type="commerce_banner"
                                                currentUrl={settings.banner_image_url || undefined}
                                                onUploadComplete={(url) => setSettings((prev) => ({ ...prev, banner_image_url: url }))}
                                                onDelete={() => setSettings((prev) => ({ ...prev, banner_image_url: "" }))}
                                                aspectRatio="16:9"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.qrImage")}</Label>
                                            <ImageUpload
                                                companyId={companyId || 0}
                                                type="payment_qr"
                                                currentUrl={settings.qr_image_url || undefined}
                                                onUploadComplete={(url) => setSettings((prev) => ({ ...prev, qr_image_url: url }))}
                                                onDelete={() => setSettings((prev) => ({ ...prev, qr_image_url: "" }))}
                                                aspectRatio="1:1"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.supportPhone")}</Label>
                                            <Input value={settings.support_phone || ""} onChange={(event) => setSettings((prev) => ({ ...prev, support_phone: event.target.value }))} />
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2">
                                        <Button className="bg-brand text-white hover:bg-brand-hover" disabled={saving} onClick={() => void saveSettings()}>
                                            {saving ? t("adminStore.saving") : t("adminStore.saveSettings")}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ) : null}

                    {!isStaffOnly ? (
                        <TabsContent value="categories" className="mt-6">
                            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                                <Card className="border-slate-200">
                                    <CardHeader>
                                        <CardTitle>{editingCategoryId ? t("adminStore.editCategory") : t("adminStore.newCategory")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.name")}</Label>
                                            <Input value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} />
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                            <Label>{t("adminStore.active")}</Label>
                                            <Switch checked={categoryForm.is_active} onCheckedChange={(value) => setCategoryForm((prev) => ({ ...prev, is_active: value }))} />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button className="bg-brand text-white hover:bg-brand-hover" disabled={saving} onClick={() => void submitCategory()}>
                                                {editingCategoryId ? t("adminStore.update") : t("adminStore.create")}
                                            </Button>
                                            {editingCategoryId ? (
                                                <Button variant="outline" onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategory); }}>
                                                    {t("adminStore.cancel")}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200">
                                    <CardHeader>
                                        <CardTitle>{t("adminStore.currentCategories")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {categories.length === 0 ? (
                                            <p className="px-6 pb-6 text-sm text-slate-500">{t("adminStore.noCategories")}</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {categories.map((category, index) => (
                                                    <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                                                        <div>
                                                            <p className="font-medium text-slate-900">{category.name}</p>
                                                            <p className="text-sm text-slate-500">
                                                                {t("adminStore.categoryPosition", { position: index + 1 })} · {category.slug}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                disabled={index === 0}
                                                                onClick={() => void moveCategory(category.id, "up")}
                                                            >
                                                                <ChevronUp className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                disabled={index === categories.length - 1}
                                                                onClick={() => void moveCategory(category.id, "down")}
                                                            >
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="outline" onClick={() => { setEditingCategoryId(category.id); setCategoryForm({ name: category.name, is_active: category.is_active }); }}>
                                                                {t("adminStore.edit")}
                                                            </Button>
                                                            <Button variant="outline" className="text-rose-600" onClick={() => void deleteEntity(`/api/admin/commerce/categories/${category.id}`, t("adminStore.feedback.categoryDeleted"))}>
                                                                {t("adminStore.delete")}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    ) : null}

                    {!isStaffOnly ? (
                        <TabsContent value="products" className="mt-6">
                            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                                <Card className="border-slate-200">
                                    <CardHeader>
                                        <CardTitle>{editingProductId ? t("adminStore.editProduct") : t("adminStore.newProduct")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.name")}</Label>
                                            <Input value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.category")}</Label>
                                            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={productForm.category_id} onChange={(event) => setProductForm((prev) => ({ ...prev, category_id: event.target.value }))}>
                                                <option value="">{t("adminStore.noCategory")}</option>
                                                {categories.map((category) => (
                                                    <option key={category.id} value={category.id}>{category.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.description")}</Label>
                                            <textarea className="min-h-[90px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={productForm.description} onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label>{t("adminStore.regularPrice", { currency: currency || settings.currency || "Bs." })}</Label>
                                                <Input value={productForm.regular_price} onChange={(event) => setProductForm((prev) => ({ ...prev, regular_price: event.target.value }))} placeholder="0.00" />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t("adminStore.promoPrice", { currency: currency || settings.currency || "Bs." })}</Label>
                                                <Input value={productForm.promotional_price} onChange={(event) => setProductForm((prev) => ({ ...prev, promotional_price: event.target.value }))} placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{t("adminStore.enablePromoSchedule")}</p>
                                                <p className="text-sm text-slate-500">{t("adminStore.enablePromoScheduleDesc")}</p>
                                            </div>
                                            <Switch checked={productForm.promo_schedule_enabled} onCheckedChange={(value) => setProductForm((prev) => ({ ...prev, promo_schedule_enabled: value, promo_valid_from: value ? prev.promo_valid_from : "", promo_valid_until: value ? prev.promo_valid_until : "" }))} />
                                        </div>
                                        {productForm.promo_schedule_enabled ? (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label>{t("adminStore.promoValidFrom")}</Label>
                                                    <Input type="date" value={productForm.promo_valid_from} onChange={(event) => setProductForm((prev) => ({ ...prev, promo_valid_from: event.target.value }))} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>{t("adminStore.promoValidUntil")}</Label>
                                                    <Input type="date" value={productForm.promo_valid_until} onChange={(event) => setProductForm((prev) => ({ ...prev, promo_valid_until: event.target.value }))} />
                                                </div>
                                            </div>
                                        ) : null}
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.stockQuantity")}</Label>
                                            <Input type="number" value={productForm.stock_quantity} onChange={(event) => setProductForm((prev) => ({ ...prev, stock_quantity: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.productImages")}</Label>
                                            <Input type="file" accept="image/*" multiple onChange={(event) => void uploadProductImages(event.target.files)} />
                                            {productForm.images.length > 0 ? (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {productForm.images.map((imageUrl, index) => (
                                                        <div key={`${imageUrl}-${index}`} className="rounded-xl border border-slate-200 p-3">
                                                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                                                <img
                                                                    src={getImageUrl(imageUrl) || imageUrl}
                                                                    alt={t("adminStore.productImageAlt", { index: index + 1 })}
                                                                    className="aspect-square w-full object-cover"
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="mt-3 w-full text-rose-600"
                                                                onClick={() =>
                                                                    setProductForm((prev) => ({
                                                                        ...prev,
                                                                        images: prev.images.filter((_, imageIndex) => imageIndex !== index),
                                                                    }))
                                                                }
                                                            >
                                                                {t("adminStore.removeImage")}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">{t("adminStore.noProductImages")}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                                                <Switch checked={productForm.is_active} onCheckedChange={(value) => setProductForm((prev) => ({ ...prev, is_active: value }))} />
                                                {t("adminStore.active")}
                                            </label>
                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                                                <Switch checked={productForm.is_featured} onCheckedChange={(value) => setProductForm((prev) => ({ ...prev, is_featured: value }))} />
                                                {t("adminStore.featured")}
                                            </label>
                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                                                <Switch checked={productForm.is_combo} onCheckedChange={(value) => setProductForm((prev) => ({ ...prev, is_combo: value }))} />
                                                {t("adminStore.combo")}
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button className="bg-brand text-white hover:bg-brand-hover" disabled={saving} onClick={() => void submitProduct()}>
                                                {editingProductId ? t("adminStore.update") : t("adminStore.create")}
                                            </Button>
                                            {editingProductId ? (
                                                <Button variant="outline" onClick={() => { setEditingProductId(null); setProductForm(emptyProduct); }}>
                                                    {t("adminStore.cancel")}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {products.map((product) => (
                                        <Card key={product.id} className="border-slate-200">
                                            <CardContent className="space-y-3 p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{product.name}</p>
                                                        <p className="text-sm text-slate-500">{product.description || t("adminStore.noDescription")}</p>
                                                    </div>
                                                    <div className="text-right text-sm">
                                                        <p className="font-semibold text-slate-900">{formatMoney(product.effective_price_cents ?? product.promotional_price_cents ?? product.regular_price_cents)}</p>
                                                        {product.promotion_active && product.promotional_price_cents ? (
                                                            <p className="text-slate-500 line-through">{formatMoney(product.regular_price_cents)}</p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                                    <span>{t("adminStore.stockCount", { count: product.stock_quantity })}</span>
                                                    {product.is_featured ? <span>{t("adminStore.featured")}</span> : null}
                                                    {product.is_combo ? <span>{t("adminStore.combo")}</span> : null}
                                                    {product.promotional_price_cents ? (
                                                        <span>
                                                            {product.promotion_active
                                                                ? t("adminStore.promoActive")
                                                                : t("adminStore.promoScheduled")}
                                                        </span>
                                                    ) : null}
                                                    {product.promo_valid_from || product.promo_valid_until ? (
                                                        <span>{formatPromoRange(product.promo_valid_from, product.promo_valid_until)}</span>
                                                    ) : null}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingProductId(product.id);
                                                            setProductForm({
                                                                category_id: product.category_id ? String(product.category_id) : "",
                                                                name: product.name,
                                                                description: product.description || "",
                                                                regular_price: formatAdminPriceInput(product.regular_price_cents),
                                                                promotional_price: formatAdminPriceInput(product.promotional_price_cents),
                                                                promo_schedule_enabled: Boolean(product.promo_valid_from || product.promo_valid_until),
                                                                promo_valid_from: product.promo_valid_from ? new Date(product.promo_valid_from).toISOString().slice(0, 10) : "",
                                                                promo_valid_until: product.promo_valid_until ? new Date(product.promo_valid_until).toISOString().slice(0, 10) : "",
                                                                stock_quantity: String(product.stock_quantity),
                                                                is_active: product.is_active,
                                                                is_featured: product.is_featured,
                                                                is_combo: product.is_combo,
                                                                images: (product.images || []).map((image) => image.image_url),
                                                            });
                                                        }}
                                                    >
                                                        {t("adminStore.edit")}
                                                    </Button>
                                                    <Button variant="outline" className="text-rose-600" onClick={() => void deleteEntity(`/api/admin/commerce/products/${product.id}`, t("adminStore.feedback.productDeleted"))}>
                                                        {t("adminStore.delete")}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    ) : null}

                    {!isStaffOnly ? (
                        <TabsContent value="points" className="mt-6">
                            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                                <Card className="border-slate-200">
                                    <CardHeader>
                                        <CardTitle>{editingPointId ? t("adminStore.editPointOfSale") : t("adminStore.newPointOfSale")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.name")}</Label>
                                            <Input value={pointForm.name} onChange={(event) => setPointForm((prev) => ({ ...prev, name: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.city")}</Label>
                                            <Input value={pointForm.city} onChange={(event) => setPointForm((prev) => ({ ...prev, city: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.osmLink")}</Label>
                                            <Input value={pointForm.osm_link} onChange={(event) => setPointForm((prev) => ({ ...prev, osm_link: event.target.value }))} placeholder={t("adminStore.osmPlaceholder")} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.openingHours")}</Label>
                                            <textarea className="min-h-[90px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={pointForm.opening_hours_text} onChange={(event) => setPointForm((prev) => ({ ...prev, opening_hours_text: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t("adminStore.supportPhone")}</Label>
                                            <Input value={pointForm.support_phone} onChange={(event) => setPointForm((prev) => ({ ...prev, support_phone: event.target.value }))} />
                                        </div>
                                        <div className="grid gap-3">
                                            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                                                {t("adminStore.pickupEnabled")}
                                                <Switch checked={pointForm.pickup_enabled} onCheckedChange={(value) => setPointForm((prev) => ({ ...prev, pickup_enabled: value }))} />
                                            </label>
                                            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                                                {t("adminStore.deliveryEnabled")}
                                                <Switch checked={pointForm.delivery_enabled} onCheckedChange={(value) => setPointForm((prev) => ({ ...prev, delivery_enabled: value }))} />
                                            </label>
                                            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                                                {t("adminStore.active")}
                                                <Switch checked={pointForm.is_active} onCheckedChange={(value) => setPointForm((prev) => ({ ...prev, is_active: value }))} />
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button className="bg-brand text-white hover:bg-brand-hover" disabled={saving} onClick={() => void submitPointOfSale()}>
                                                {editingPointId ? t("adminStore.update") : t("adminStore.create")}
                                            </Button>
                                            {editingPointId ? (
                                                <Button variant="outline" onClick={() => { setEditingPointId(null); setPointForm(emptyPoint); }}>
                                                    {t("adminStore.cancel")}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200">
                                    <CardHeader>
                                        <CardTitle>{t("adminStore.currentPointsOfSale")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {pointsOfSale.map((point) => (
                                            <div key={point.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{point.name}</p>
                                                    <p className="text-sm text-slate-500">{point.city}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingPointId(point.id);
                                                            setPointForm({
                                                                name: point.name,
                                                                city: point.city,
                                                                osm_link: point.osm_link ?? "",
                                                                opening_hours_text: point.opening_hours_text ?? "",
                                                                support_phone: point.support_phone ?? "",
                                                                pickup_enabled: point.pickup_enabled,
                                                                delivery_enabled: point.delivery_enabled,
                                                                is_active: point.is_active,
                                                            });
                                                        }}
                                                    >
                                                        {t("adminStore.edit")}
                                                    </Button>
                                                    <Button variant="outline" className="text-rose-600" onClick={() => void deleteEntity(`/api/admin/commerce/points-of-sale/${point.id}`, t("adminStore.feedback.pointDeleted"))}>
                                                        {t("adminStore.delete")}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    ) : null}

                    {!isStaffOnly ? (
                        <TabsContent value="rules" className="mt-6">
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle>{t("adminStore.deliveryRulesTitle")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {deliveryRulesSource === "company_hours"
                                                    ? t("adminStore.usingStoreHours")
                                                    : t("adminStore.usingExplicitDeliveryRules")}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {deliveryRulesSource === "company_hours"
                                                    ? t("adminStore.deliveryRulesFallbackDesc")
                                                    : t("adminStore.deliveryRulesOverrideDesc")}
                                            </p>
                                        </div>
                                        <Button variant="outline" onClick={() => void resetDeliveryRulesToStoreHours()}>
                                            {t("adminStore.useStoreHoursDefaults")}
                                        </Button>
                                    </div>
                                    {deliveryRules.map((rule) => (
                                        <div key={rule.weekday} className="rounded-2xl border border-slate-200 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-slate-900">{t(`adminStore.weekdays.${rule.weekday}`)}</p>
                                                    <p className="text-sm text-slate-500">{t("adminStore.deliveryRuleDesc")}</p>
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-3">
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <Switch checked={rule.delivery_enabled} onCheckedChange={(value) => setDeliveryRules((prev) => prev.map((item) => item.weekday === rule.weekday ? { ...item, delivery_enabled: value } : item))} />
                                                        {t("adminStore.delivery")}
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <Switch checked={rule.asap_enabled} onCheckedChange={(value) => setDeliveryRules((prev) => prev.map((item) => item.weekday === rule.weekday ? { ...item, asap_enabled: value } : item))} />
                                                        {t("adminStore.asap")}
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <Switch checked={rule.scheduled_enabled} onCheckedChange={(value) => setDeliveryRules((prev) => prev.map((item) => item.weekday === rule.weekday ? { ...item, scheduled_enabled: value } : item))} />
                                                        {t("adminStore.scheduled")}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="mt-4 grid gap-2">
                                                <div className="flex items-center justify-between">
                                                    <Label>{t("adminStore.deliveryWindows")}</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDeliveryRules((prev) =>
                                                                prev.map((item) =>
                                                                    item.weekday === rule.weekday
                                                                        ? {
                                                                              ...item,
                                                                              windows: [
                                                                                  ...(item.windows || []),
                                                                                  { label: "", start_time: "", end_time: "" },
                                                                              ],
                                                                          }
                                                                        : item,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        {t("adminStore.addWindow")}
                                                    </Button>
                                                </div>
                                                <div className="space-y-3">
                                                    {(rule.windows || []).length === 0 ? (
                                                        <p className="text-sm text-slate-500">{t("adminStore.noWindowsForDay")}</p>
                                                    ) : null}
                                                    {(rule.windows || []).map((window, index) => (
                                                        <div key={`${rule.weekday}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1.2fr_120px_120px_auto]">
                                                            <Input
                                                                value={window.label}
                                                                onChange={(event) =>
                                                                    setDeliveryRules((prev) =>
                                                                        prev.map((item) =>
                                                                            item.weekday === rule.weekday
                                                                                ? {
                                                                                      ...item,
                                                                                      windows: item.windows.map((entry, entryIndex) =>
                                                                                          entryIndex === index
                                                                                              ? { ...entry, label: event.target.value }
                                                                                              : entry,
                                                                                      ),
                                                                                  }
                                                                                : item,
                                                                        ),
                                                                    )
                                                                }
                                                                placeholder={t("adminStore.windowLabelPlaceholder")}
                                                            />
                                                            <Input
                                                                type="time"
                                                                value={window.start_time || ""}
                                                                onChange={(event) =>
                                                                    setDeliveryRules((prev) =>
                                                                        prev.map((item) =>
                                                                            item.weekday === rule.weekday
                                                                                ? {
                                                                                      ...item,
                                                                                      windows: item.windows.map((entry, entryIndex) =>
                                                                                          entryIndex === index
                                                                                              ? { ...entry, start_time: event.target.value }
                                                                                              : entry,
                                                                                      ),
                                                                                  }
                                                                                : item,
                                                                        ),
                                                                    )
                                                                }
                                                            />
                                                            <Input
                                                                type="time"
                                                                value={window.end_time || ""}
                                                                onChange={(event) =>
                                                                    setDeliveryRules((prev) =>
                                                                        prev.map((item) =>
                                                                            item.weekday === rule.weekday
                                                                                ? {
                                                                                      ...item,
                                                                                      windows: item.windows.map((entry, entryIndex) =>
                                                                                          entryIndex === index
                                                                                              ? { ...entry, end_time: event.target.value }
                                                                                              : entry,
                                                                                      ),
                                                                                  }
                                                                                : item,
                                                                        ),
                                                                    )
                                                                }
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="text-rose-600"
                                                                onClick={() =>
                                                                    setDeliveryRules((prev) =>
                                                                        prev.map((item) =>
                                                                            item.weekday === rule.weekday
                                                                                ? {
                                                                                      ...item,
                                                                                      windows: item.windows.filter((_, entryIndex) => entryIndex !== index),
                                                                                  }
                                                                                : item,
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                {t("adminStore.remove")}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isDeliveryRulesDirty && (
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                            <p className="text-sm font-medium text-amber-800">Unsaved changes</p>
                                            <div className="flex items-center gap-3">
                                                <span className="hidden text-xs text-amber-600 sm:block">⌘S</span>
                                                <Button
                                                    size="sm"
                                                    className="bg-brand text-white hover:bg-brand-hover"
                                                    disabled={saving}
                                                    onClick={() => void saveDeliveryRules()}
                                                >
                                                    {saving ? t("adminStore.saving") : t("adminStore.saveDeliveryRules")}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <StickyFormActions
                                show={isDeliveryRulesDirty}
                                onSave={() => void saveDeliveryRules()}
                                loading={saving}
                                saveLabel={t("adminStore.saveDeliveryRules")}
                                loadingLabel={t("adminStore.saving")}
                                saveClassName="bg-brand text-white hover:bg-brand-hover"
                            />
                        </TabsContent>
                    ) : null}

                    <TabsContent value="orders" className="mt-6">
                        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle>{t("adminStore.filters")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>{t("adminStore.status")}</Label>
                                        <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                            <option value="">{t("adminStore.all")}</option>
                                            {[...new Set(orders.map((order) => order.status))].map((status) => (
                                                <option key={status} value={status}>{getOrderStatusLabel(status)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button variant="outline" onClick={() => void fetchOrders()}>
                                        {t("adminStore.applyFilters")}
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                {visibleOrders.map((order) => (
                                    <Card key={order.id} className="border-slate-200">
                                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                                            <div>
                                                <p className="font-semibold text-slate-900">{t("adminStore.orderNumber", { id: order.id })}</p>
                                                <p className="text-sm text-slate-500">
                                                    {order.guest_name} · {getFulfillmentLabel(order.fulfillment_type)} · {getOrderStatusLabel(order.status)}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {formatMoney(order.total_cents)}
                                                    {order.point_of_sale ? ` · ${order.point_of_sale.name}` : ""}
                                                </p>
                                            </div>
                                            <Button variant="outline" onClick={() => void openOrderDetail(order.id)}>
                                                {t("adminStore.open")}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    {selectedOrder ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t("adminStore.orderNumber", { id: selectedOrder.id })}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                                <div className="space-y-4">
                                    <Card className="border-slate-200">
                                        <CardContent className="grid gap-3 p-4 text-sm">
                                            <div><span className="font-medium text-slate-900">{t("adminStore.customer")}:</span> {selectedOrder.guest_name}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.phonePrefix")}:</span> {selectedOrder.guest_phone_prefix || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.phone")}:</span> {selectedOrder.guest_phone || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.email")}:</span> {selectedOrder.guest_email || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.fulfillment")}:</span> {getFulfillmentLabel(selectedOrder.fulfillment_type)}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.orderType")}:</span> {getOrderTypeLabel(selectedOrder.order_type)}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.status")}:</span> {getOrderStatusLabel(selectedOrder.status)}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.payment")}:</span> {selectedOrder.payment_status ? getPaymentStatusLabel(selectedOrder.payment_status) : "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.scheduledDate")}:</span> {selectedOrder.scheduled_date || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.scheduledTimeframe")}:</span> {selectedOrder.scheduled_timeframe || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.deliveryAddress")}:</span> {selectedOrder.delivery_address || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.deliveryInstructions")}:</span> {selectedOrder.delivery_instructions || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.pointOfSale")}:</span> {selectedOrder.point_of_sale ? `${selectedOrder.point_of_sale.name} · ${selectedOrder.point_of_sale.city}` : "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.supportPhone")}:</span> {selectedOrder.support_phone_snapshot || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.customerNotes")}:</span> {selectedOrder.notes || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.internalNotes")}:</span> {selectedOrder.internal_notes || "-"}</div>
                                            <div><span className="font-medium text-slate-900">{t("adminStore.total")}:</span> {formatMoney(selectedOrder.total_cents)}</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle>{t("adminStore.items")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {selectedOrder.items?.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{item.product_name_snapshot}</p>
                                                        <p className="text-sm text-slate-500">{t("adminStore.qty", { count: item.quantity })}</p>
                                                    </div>
                                                    <p className="font-semibold text-slate-900">{formatMoney(item.subtotal_cents)}</p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    {!isStaffOnly ? (
                                        <Card className="border-slate-200">
                                            <CardHeader>
                                                <CardTitle>{t("adminStore.assignment")}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={assignedStaffDraft} onChange={(event) => setAssignedStaffDraft(event.target.value)}>
                                                    <option value="">{t("adminStore.chooseStaff")}</option>
                                                    {staffMembers.map((staff) => (
                                                        <option key={staff.id} value={staff.id}>{staff.display_name}</option>
                                                    ))}
                                                </select>
                                                <Button variant="outline" className="w-full" onClick={() => void assignSelectedOrder()}>
                                                    {t("adminStore.assignOrder")}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ) : null}

                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle>{t("adminStore.statusWorkflow")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={orderStatusDraft} onChange={(event) => setOrderStatusDraft(event.target.value)}>
                                                {(isStaffOnly ? STAFF_STATUSES : ADMIN_STATUSES).map((status) => (
                                                    <option key={status} value={status}>{getOrderStatusLabel(status)}</option>
                                                ))}
                                            </select>
                                            <Button className="w-full bg-brand text-white hover:bg-brand-hover" onClick={() => void updateSelectedOrderStatus()}>
                                                {t("adminStore.updateStatus")}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {!isStaffOnly ? (
                                        <Card className="border-slate-200">
                                            <CardHeader>
                                                <CardTitle>{t("adminStore.paymentResolution")}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={paymentStatusDraft} onChange={(event) => setPaymentStatusDraft(event.target.value)}>
                                                    {ADMIN_PAYMENT_STATUSES.map((status) => (
                                                        <option key={status} value={status}>{getPaymentStatusLabel(status)}</option>
                                                    ))}
                                                </select>
                                                <Button variant="outline" className="w-full" onClick={() => void updatePaymentStatus()}>
                                                    {t("adminStore.updatePaymentStatus")}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ) : null}

                                    <Card className="border-slate-200">
                                        <CardHeader>
                                            <CardTitle>{t("adminStore.trackingLink")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <Input value={trackingDraft} onChange={(event) => setTrackingDraft(event.target.value)} placeholder={t("adminStore.trackingPlaceholder")} />
                                            {!isStaffOnly ? (
                                                <Button variant="outline" className="w-full" onClick={() => void updateTrackingLink()}>
                                                    {t("adminStore.saveTrackingLink")}
                                                </Button>
                                            ) : (
                                                <p className="text-xs text-slate-500">{t("adminStore.trackingManagedByAdmins")}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}
