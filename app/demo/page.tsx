"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
    LayoutDashboard,
    Calendar,
    Scissors,
    Users,
    UserCheck,
    Clock,
    Palette,
    Settings,
    Menu,
    X,
    ChevronRight,
    ChevronLeft,
    DollarSign,
    TrendingUp,
    Trophy,
    Repeat,
    UserPlus,
    BarChart3,
    Star,
    Phone,
    Mail,
    Eye,
    Plus,
    Search,
    BellRing,
    Filter,
    Pencil,
    Trash2,
    FileText,
    UserCircle,
    Send,
    Download,
    Upload,
    MessageCircle,
    Save,
    Building2,
    MapPin,
    Globe,
    CreditCard,
    Bell,
    Share2,
    Languages,
    Check,
    Loader2,
    CalendarClock,
    Image as ImageIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { I18nProvider, useT } from "@/lib/i18n";
import { format, addDays } from "date-fns";

/* ================================================================== */
/*  MOCK DATA                                                          */
/* ================================================================== */

const MOCK_COMPANY = {
    name: "Bella Studio",
    slug: "bella-studio",
    plan: "BUSINESS" as const,
    role: "owner",
};

const MOCK_METRICS = {
    bookings: { total: 1248, thisMonth: 87, today: 6, upcoming7Days: 34 },
    revenue: { total: 4_572_000, thisMonth: 348_500, today: 42_000, avgPerBooking: 4_000 },
    topServices: [
        { id: 1, name: "Corte de Cabello", count: 312, percentage: 100 },
        { id: 2, name: "Tinte Completo", count: 198, percentage: 63 },
        { id: 3, name: "Manicure", count: 167, percentage: 54 },
        { id: 4, name: "Tratamiento Keratina", count: 124, percentage: 40 },
        { id: 5, name: "Peinado Especial", count: 89, percentage: 29 },
    ],
    topStaff: [
        { id: 1, name: "María López", bookingCount: 156, revenue: 624_000 },
        { id: 2, name: "Carlos Mendoza", bookingCount: 134, revenue: 536_000 },
        { id: 3, name: "Ana Gutiérrez", bookingCount: 112, revenue: 448_000 },
    ],
    bookingsByStatus: [
        { status: "COMPLETED", count: 892 },
        { status: "CONFIRMED", count: 187 },
        { status: "PENDING", count: 64 },
        { status: "CANCELLED", count: 78 },
        { status: "NO_SHOW", count: 27 },
    ],
    bookingsByCategory: [
        { categoryName: "Cabello", count: 510 },
        { categoryName: "Uñas", count: 312 },
        { categoryName: "Tratamientos", count: 248 },
        { categoryName: "Maquillaje", count: 178 },
    ],
    busiestMoments: {
        busiestDays: [
            { dayOfWeek: 6, count: 234 },
            { dayOfWeek: 5, count: 198 },
            { dayOfWeek: 4, count: 176 },
        ],
        busiestHours: [
            { hour: 10, count: 189 },
            { hour: 11, count: 176 },
            { hour: 15, count: 162 },
        ],
    },
    customerInsights: {
        totalCustomers: 423,
        newCustomersThisMonth: 28,
        newCustomersThisWeek: 7,
        returningCustomers: 312,
        repeatRate: 73.8,
        avgBookingsPerCustomer: 3.2,
    },
    customerGrowthTrend: [
        { month: "2025-10", newCustomers: 18 },
        { month: "2025-11", newCustomers: 24 },
        { month: "2025-12", newCustomers: 31 },
        { month: "2026-01", newCustomers: 22 },
        { month: "2026-02", newCustomers: 26 },
        { month: "2026-03", newCustomers: 28 },
    ],
};

type MockBookingStatus = "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface MockBooking {
    id: number;
    time: string;
    endTime: string;
    client: string;
    phone: string;
    email: string;
    service: string;
    staff: string;
    status: MockBookingStatus;
    price: number;
    date: string;
}

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");
const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");
const yesterdayStr = format(addDays(today, -1), "yyyy-MM-dd");

const MOCK_BOOKINGS: MockBooking[] = [
    { id: 1, time: "09:00", endTime: "09:45", client: "Laura Fernández", phone: "+591 72345678", email: "laura@email.com", service: "Corte de Cabello", staff: "María López", status: "CONFIRMED", price: 3500, date: todayStr },
    { id: 2, time: "10:00", endTime: "11:30", client: "Sofía Ramos", phone: "+591 71234567", email: "sofia@email.com", service: "Tinte Completo", staff: "Ana Gutiérrez", status: "CONFIRMED", price: 8500, date: todayStr },
    { id: 3, time: "10:30", endTime: "11:15", client: "Daniela Cruz", phone: "+591 76543210", email: "daniela@email.com", service: "Manicure", staff: "Carlos Mendoza", status: "PENDING", price: 2500, date: todayStr },
    { id: 4, time: "11:00", endTime: "11:45", client: "Valentina Morales", phone: "+591 73456789", email: "valentina@email.com", service: "Corte de Cabello", staff: "María López", status: "COMPLETED", price: 3500, date: todayStr },
    { id: 5, time: "13:00", endTime: "14:30", client: "Camila Vargas", phone: "+591 74567890", email: "camila@email.com", service: "Tratamiento Keratina", staff: "Ana Gutiérrez", status: "PENDING", price: 12000, date: todayStr },
    { id: 6, time: "14:00", endTime: "15:00", client: "Isabella Rojas", phone: "+591 75678901", email: "isabella@email.com", service: "Peinado Especial", staff: "Carlos Mendoza", status: "CONFIRMED", price: 5000, date: todayStr },
    { id: 7, time: "09:30", endTime: "10:15", client: "Fernanda Suárez", phone: "+591 76789012", email: "fernanda@email.com", service: "Corte de Cabello", staff: "María López", status: "CONFIRMED", price: 3500, date: tomorrowStr },
    { id: 8, time: "11:00", endTime: "12:30", client: "Carolina Peña", phone: "+591 77890123", email: "carolina@email.com", service: "Tinte Completo", staff: "Ana Gutiérrez", status: "PENDING", price: 8500, date: tomorrowStr },
    { id: 9, time: "10:00", endTime: "10:45", client: "Lucía Torres", phone: "+591 78901234", email: "lucia@email.com", service: "Manicure", staff: "Carlos Mendoza", status: "COMPLETED", price: 2500, date: yesterdayStr },
    { id: 10, time: "15:00", endTime: "16:00", client: "Andrea Paredes", phone: "+591 79012345", email: "andrea@email.com", service: "Peinado Especial", staff: "María López", status: "CANCELLED", price: 5000, date: yesterdayStr },
];

interface MockService {
    id: number;
    name: string;
    description: string;
    category: string;
    category_id: number;
    price: number;
    duration: number;
    active: boolean;
}

const MOCK_CATEGORIES = [
    { id: 1, name: "Cabello" },
    { id: 2, name: "Uñas" },
    { id: 3, name: "Tratamientos" },
    { id: 4, name: "Maquillaje" },
];

const MOCK_SERVICES: MockService[] = [
    { id: 1, name: "Corte de Cabello", description: "Corte clásico o moderno", category: "Cabello", category_id: 1, price: 3500, duration: 45, active: true },
    { id: 2, name: "Tinte Completo", description: "Coloración completa profesional", category: "Cabello", category_id: 1, price: 8500, duration: 90, active: true },
    { id: 3, name: "Manicure", description: "Limpieza, limado y esmaltado", category: "Uñas", category_id: 2, price: 2500, duration: 45, active: true },
    { id: 4, name: "Pedicure", description: "Cuidado completo de pies", category: "Uñas", category_id: 2, price: 3000, duration: 60, active: true },
    { id: 5, name: "Tratamiento Keratina", description: "Alisado y nutrición profunda", category: "Tratamientos", category_id: 3, price: 12000, duration: 90, active: true },
    { id: 6, name: "Peinado Especial", description: "Peinado para eventos y ocasiones", category: "Cabello", category_id: 1, price: 5000, duration: 60, active: true },
    { id: 7, name: "Maquillaje Profesional", description: "Maquillaje para eventos", category: "Maquillaje", category_id: 4, price: 7000, duration: 60, active: true },
    { id: 8, name: "Uñas Acrílicas", description: "Extensiones de uñas acrílicas", category: "Uñas", category_id: 2, price: 6000, duration: 75, active: false },
];

interface MockStaff {
    id: number;
    name: string;
    email: string;
    role: string;
    bookable: boolean;
    image: string | null;
    services: number[];
    bio: string;
    status: string;
    start_date: string;
}

const MOCK_STAFF: MockStaff[] = [
    { id: 1, name: "María López", email: "maria@bellastudio.com", role: "ADMIN", bookable: true, image: null, services: [1, 2, 5, 6, 7], bio: "Estilista profesional con 8 años de experiencia", status: "ACTIVE", start_date: "2024-01-15" },
    { id: 2, name: "Carlos Mendoza", email: "carlos@bellastudio.com", role: "STAFF", bookable: true, image: null, services: [1, 3, 4, 6], bio: "Especialista en cortes modernos", status: "ACTIVE", start_date: "2024-03-01" },
    { id: 3, name: "Ana Gutiérrez", email: "ana@bellastudio.com", role: "STAFF", bookable: true, image: null, services: [2, 3, 4, 5, 7, 8], bio: "Manicurista y colorista certificada", status: "ACTIVE", start_date: "2024-06-10" },
];

interface MockCustomer {
    id: number;
    name: string;
    phone: string;
    email: string;
    bookings: number;
    completed: number;
    cancelled: number;
    noShow: number;
    spent: number;
    avgTicket: number;
    lastVisit: string;
    nextBooking: string | null;
    favoriteStaff: string;
    preference: string;
}

const MOCK_CUSTOMERS: MockCustomer[] = [
    { id: 1, name: "Laura Fernández", phone: "+591 72345678", email: "laura@email.com", bookings: 12, completed: 10, cancelled: 1, noShow: 1, spent: 42000, avgTicket: 3500, lastVisit: "2026-03-10", nextBooking: "2026-03-15", favoriteStaff: "María López", preference: "Corte de Cabello" },
    { id: 2, name: "Sofía Ramos", phone: "+591 71234567", email: "sofia@email.com", bookings: 8, completed: 7, cancelled: 1, noShow: 0, spent: 68000, avgTicket: 8500, lastVisit: "2026-03-09", nextBooking: null, favoriteStaff: "Ana Gutiérrez", preference: "Tinte Completo" },
    { id: 3, name: "Daniela Cruz", phone: "+591 76543210", email: "daniela@email.com", bookings: 15, completed: 14, cancelled: 0, noShow: 1, spent: 37500, avgTicket: 2500, lastVisit: "2026-03-11", nextBooking: "2026-03-14", favoriteStaff: "Carlos Mendoza", preference: "Manicure" },
    { id: 4, name: "Valentina Morales", phone: "+591 73456789", email: "valentina@email.com", bookings: 6, completed: 5, cancelled: 1, noShow: 0, spent: 21000, avgTicket: 3500, lastVisit: "2026-03-08", nextBooking: null, favoriteStaff: "María López", preference: "Corte de Cabello" },
    { id: 5, name: "Camila Vargas", phone: "+591 74567890", email: "camila@email.com", bookings: 3, completed: 3, cancelled: 0, noShow: 0, spent: 36000, avgTicket: 12000, lastVisit: "2026-03-05", nextBooking: "2026-03-20", favoriteStaff: "Ana Gutiérrez", preference: "Tratamiento Keratina" },
    { id: 6, name: "Isabella Rojas", phone: "+591 75678901", email: "isabella@email.com", bookings: 20, completed: 18, cancelled: 1, noShow: 1, spent: 100000, avgTicket: 5000, lastVisit: "2026-03-12", nextBooking: null, favoriteStaff: "María López", preference: "Peinado Especial" },
];

const MOCK_HOURS = [
    { day: 0, name: "Domingo", is_open: false, slots: [] },
    { day: 1, name: "Lunes", is_open: true, slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 2, name: "Martes", is_open: true, slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 3, name: "Miércoles", is_open: true, slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 4, name: "Jueves", is_open: true, slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 5, name: "Viernes", is_open: true, slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "20:00" }] },
    { day: 6, name: "Sábado", is_open: true, slots: [{ start_time: "08:00", end_time: "13:00" }] },
];

const MOCK_AVAILABILITY = [
    { day: 1, label: "Lunes", slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 2, label: "Martes", slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 3, label: "Miércoles", slots: [{ start_time: "09:00", end_time: "19:00" }] },
    { day: 4, label: "Jueves", slots: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "14:00", end_time: "19:00" }] },
    { day: 5, label: "Viernes", slots: [{ start_time: "09:00", end_time: "20:00" }] },
    { day: 6, label: "Sábado", slots: [{ start_time: "08:00", end_time: "13:00" }] },
];

const MOCK_TIME_OFF = [
    { id: 1, staff: "María López", starts_at: "2026-03-20T08:00", ends_at: "2026-03-20T18:00", reason: "Cita médica", status: "APPROVED" as const },
    { id: 2, staff: "Carlos Mendoza", starts_at: "2026-03-25T00:00", ends_at: "2026-03-28T23:59", reason: "Vacaciones", status: "PENDING" as const },
];

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("es-BO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function getStatusColor(status: string) {
    switch (status) {
        case "CONFIRMED": return "bg-emerald-100 text-emerald-800";
        case "PENDING": return "bg-amber-100 text-amber-800";
        case "COMPLETED": return "bg-blue-100 text-blue-800";
        case "CANCELLED": return "bg-red-100 text-red-800";
        case "NO_SHOW": return "bg-slate-100 text-slate-800";
        default: return "bg-slate-100 text-slate-600";
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "CONFIRMED": return "Confirmada";
        case "PENDING": return "Pendiente";
        case "COMPLETED": return "Completada";
        case "CANCELLED": return "Cancelada";
        case "NO_SHOW": return "No Asistió";
        default: return status;
    }
}

function getDayLabel(dayOfWeek: number) {
    const base = new Date(2024, 0, 7 + dayOfWeek);
    return new Intl.DateTimeFormat("es", { weekday: "short" }).format(base);
}

function getMonthLabel(monthKey: string) {
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
    return new Intl.DateTimeFormat("es", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });
}

/* ================================================================== */
/*  TABS                                                               */
/* ================================================================== */

type DemoTab = "dashboard" | "bookings" | "services" | "staff" | "customers" | "availability" | "hours" | "theme" | "settings" | "profile";

const DEMO_TABS: { key: DemoTab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Panel", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
    { key: "bookings", label: "Reservas", icon: <Calendar className="h-5 w-5 shrink-0" /> },
    { key: "services", label: "Servicios", icon: <Scissors className="h-5 w-5 shrink-0" /> },
    { key: "staff", label: "Personal", icon: <Users className="h-5 w-5 shrink-0" /> },
    { key: "customers", label: "Clientes", icon: <UserCheck className="h-5 w-5 shrink-0" /> },
    { key: "availability", label: "Disponibilidad", icon: <Calendar className="h-5 w-5 shrink-0" /> },
    { key: "hours", label: "Horario", icon: <Clock className="h-5 w-5 shrink-0" /> },
    { key: "theme", label: "Tema", icon: <Palette className="h-5 w-5 shrink-0" /> },
    { key: "settings", label: "Configuración", icon: <Settings className="h-5 w-5 shrink-0" /> },
    { key: "profile", label: "Mi perfil", icon: <UserCircle className="h-5 w-5 shrink-0" /> },
];

/* ================================================================== */
/*  DEMO PAGE                                                          */
/* ================================================================== */

export default function DemoPage() {
    return (
        <I18nProvider defaultLocale="es">
            <DemoShell />
        </I18nProvider>
    );
}

function DemoShell() {
    const t = useT();
    const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-slate-100">
            {/* Demo banner */}
            <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between gap-3 bg-gradient-to-r from-brand to-pink-600 px-4 py-2 text-white shadow-lg sm:justify-center">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold tracking-wide sm:text-sm">
                        {t("demo.banner")}
                    </span>
                </div>
                <Link href="/negocios">
                    <Button size="sm" className="shrink-0 border-white/30 bg-white/20 text-xs font-semibold text-white hover:bg-white/30">
                        {t("demo.cta")}
                    </Button>
                </Link>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 pt-10 text-white transition-transform duration-200 lg:relative lg:translate-x-0 lg:flex-shrink-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}>
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
                        <div className="min-w-0">
                            <Image src="/assets/priconpri/logo-horizontal-pink-outline.png" alt="PriConPri" width={600} height={370} className="h-4 w-auto" priority />
                            <div className="mt-1 flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">B</div>
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-semibold">{MOCK_COMPANY.name}</span>
                                    <span className="text-xs text-slate-400 capitalize">{MOCK_COMPANY.role}</span>
                                </div>
                            </div>
                        </div>
                        <button className="rounded p-1 hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(false)}>
                            <X className="h-5 w-5 shrink-0" />
                        </button>
                    </div>
                    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                        {DEMO_TABS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    activeTab === item.key ? "bg-brand text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                                )}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className="border-t border-slate-800 p-4">
                        <span className="flex items-center gap-2 text-sm text-slate-400">
                            <ChevronRight className="h-4 w-4 shrink-0" />
                            Ver Tienda
                        </span>
                    </div>
                    <div className="border-t border-slate-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">B</div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">Bella Dueña</p>
                                <p className="truncate text-xs text-slate-400">bella@bellastudio.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col h-[100dvh] overflow-hidden pt-10">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 shadow-sm lg:px-6">
                    <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-5 w-5 shrink-0" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-slate-900">
                            {DEMO_TABS.find((tab) => tab.key === activeTab)?.label || "Panel"}
                        </h1>
                    </div>
                    <Badge variant="outline" className="border-brand/30 bg-brand/5 text-xs text-brand">
                        Plan {MOCK_COMPANY.plan}
                    </Badge>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {activeTab === "dashboard" && <DemoDashboard />}
                    {activeTab === "bookings" && <DemoBookings />}
                    {activeTab === "services" && <DemoServicesTab />}
                    {activeTab === "staff" && <DemoStaffTab />}
                    {activeTab === "customers" && <DemoCustomersTab />}
                    {activeTab === "availability" && <DemoAvailability />}
                    {activeTab === "hours" && <DemoHours />}
                    {activeTab === "theme" && <DemoTheme />}
                    {activeTab === "settings" && <DemoSettings />}
                    {activeTab === "profile" && <DemoProfile />}
                </main>
            </div>
        </div>
    );
}

/* ================================================================== */
/*  DASHBOARD TAB                                                      */
/* ================================================================== */

function DemoDashboard() {
    const m = MOCK_METRICS;
    const maxStatusCount = Math.max(...m.bookingsByStatus.map((i) => i.count));
    const maxCategoryCount = Math.max(...m.bookingsByCategory.map((i) => i.count));
    const maxTrendCount = Math.max(...m.customerGrowthTrend.map((i) => i.newCustomers));

    const primaryStats = [
        { label: "Total de Reservas", value: m.bookings.total.toLocaleString(), sub: `${m.bookings.thisMonth} este mes`, icon: <Calendar className="h-5 w-5 shrink-0" />, color: "text-blue-600 bg-blue-50" },
        { label: "Ingresos del mes", value: formatCurrency(m.revenue.thisMonth), sub: `${formatCurrency(m.revenue.total)} en total`, icon: <DollarSign className="h-5 w-5 shrink-0" />, color: "text-emerald-600 bg-emerald-50" },
        { label: "Hoy", value: m.bookings.today.toLocaleString(), sub: `${formatCurrency(m.revenue.today)} de ingresos`, icon: <TrendingUp className="h-5 w-5 shrink-0" />, color: "text-purple-600 bg-purple-50" },
        { label: "Próximos 7 días", value: m.bookings.upcoming7Days.toLocaleString(), sub: `Promedio ${formatCurrency(m.revenue.avgPerBooking)} por reserva`, icon: <Clock className="h-5 w-5 shrink-0" />, color: "text-amber-600 bg-amber-50" },
    ];

    const customerStats = [
        { label: "Clientes totales", value: m.customerInsights.totalCustomers.toLocaleString(), sub: `${m.customerInsights.newCustomersThisMonth} nuevos este mes`, icon: <Users className="h-5 w-5 shrink-0" />, color: "text-cyan-700 bg-cyan-50" },
        { label: "Clientes recurrentes", value: m.customerInsights.returningCustomers.toLocaleString(), sub: `Tasa de repetición ${formatPercent(m.customerInsights.repeatRate)}`, icon: <Repeat className="h-5 w-5 shrink-0" />, color: "text-slate-700 bg-slate-100" },
        { label: "Nuevos esta semana", value: m.customerInsights.newCustomersThisWeek.toLocaleString(), sub: `Promedio ${m.customerInsights.avgBookingsPerCustomer} reservas/cliente`, icon: <UserPlus className="h-5 w-5 shrink-0" />, color: "text-rose-700 bg-rose-50" },
        { label: "Reservas por estado", value: m.bookingsByStatus.reduce((s, i) => s + i.count, 0).toLocaleString(), sub: `${m.bookingsByStatus.length} grupos de estado`, icon: <BarChart3 className="h-5 w-5 shrink-0" />, color: "text-indigo-700 bg-indigo-50" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Bienvenido, {MOCK_COMPANY.name}</h2>
                <p className="text-slate-600">Rol: {MOCK_COMPANY.role}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {primaryStats.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">{stat.label}</CardTitle>
                            <div className={cn("rounded-lg p-2", stat.color)}>{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {customerStats.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">{stat.label}</CardTitle>
                            <div className={cn("rounded-lg p-2", stat.color)}>{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Servicios más vendidos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {m.topServices.map((service, i) => (
                                <div key={service.id} className="flex items-center gap-3">
                                    <span className="w-5 text-right text-sm font-bold text-slate-400">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="truncate text-sm font-medium text-slate-700">{service.name}</span>
                                            <span className="ml-2 shrink-0 text-xs text-slate-500">{service.count} reservas</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${service.percentage}%` }} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-blue-500" /> Personal destacado</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {m.topStaff.map((staff, i) => (
                                <div key={staff.id} className="flex items-center gap-3">
                                    <span className="w-5 text-right text-sm font-bold text-slate-400">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="truncate text-sm font-medium text-slate-700">{staff.name}</span>
                                            <div className="ml-2 flex shrink-0 items-center gap-3">
                                                <span className="text-xs text-slate-500">{staff.bookingCount} reservas</span>
                                                <span className="text-xs font-medium text-emerald-600">{formatCurrency(staff.revenue)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-200">
                    <CardHeader><CardTitle className="text-base">Reservas por estado</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {m.bookingsByStatus.map((item) => {
                                const width = maxStatusCount > 0 ? (item.count / maxStatusCount) * 100 : 0;
                                return (<div key={item.status} className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-slate-600">{getStatusLabel(item.status)}</span><span className="font-medium text-slate-800">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} /></div></div>);
                            })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader><CardTitle className="text-base">Reservas por categoría</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {m.bookingsByCategory.map((item, index) => {
                                const width = maxCategoryCount > 0 ? (item.count / maxCategoryCount) * 100 : 0;
                                return (<div key={`${item.categoryName}-${index}`} className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-slate-600">{item.categoryName}</span><span className="font-medium text-slate-800">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} /></div></div>);
                            })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardHeader><CardTitle className="text-base">Momentos más ocupados</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Días más ocupados</p>
                            <div className="space-y-1 text-sm text-slate-700">{m.busiestMoments.busiestDays.map((e) => <p key={e.dayOfWeek}>{getDayLabel(e.dayOfWeek)}: {e.count}</p>)}</div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Horas más ocupadas</p>
                            <div className="space-y-1 text-sm text-slate-700">{m.busiestMoments.busiestHours.map((e) => <p key={e.hour}>{e.hour.toString().padStart(2, "0")}:00 · {e.count} reservas</p>)}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Card className="border-slate-200">
                <CardHeader><CardTitle className="text-base">Tendencia de crecimiento de clientes</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {m.customerGrowthTrend.map((point) => {
                            const height = maxTrendCount > 0 ? Math.max(8, Math.round((point.newCustomers / maxTrendCount) * 48)) : 8;
                            return (<div key={point.month} className="rounded-md border border-slate-200 p-3"><p className="text-xs text-slate-500">{getMonthLabel(point.month)}</p><div className="mt-2 flex items-end gap-2"><div className="w-2 rounded-full bg-cyan-500" style={{ height: `${height}px` }} /><p className="text-sm font-semibold text-slate-800">{point.newCustomers}</p></div></div>);
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ================================================================== */
/*  BOOKINGS TAB                                                       */
/* ================================================================== */

function DemoBookings() {
    const [bookings, setBookings] = useState(MOCK_BOOKINGS);
    const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
    const [staffFilter, setStaffFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedBooking, setSelectedBooking] = useState<MockBooking | null>(null);

    const filtered = useMemo(() => {
        return bookings.filter((b) => {
            if (staffFilter !== "ALL" && b.staff !== staffFilter) return false;
            if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
            return true;
        });
    }, [bookings, staffFilter, statusFilter]);

    const activeFilterCount = (staffFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0);

    const handleStatusChange = (id: number, newStatus: MockBookingStatus) => {
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: newStatus } : b));
        if (selectedBooking?.id === id) setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reservas</h1>
                    <p className="text-slate-500">Gestiona tus citas y horarios.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-brand/30 text-brand hover:bg-brand/5">
                        <BellRing className="mr-2 h-4 w-4 shrink-0" /> Enviar Recordatorios
                    </Button>
                    <Button className="bg-brand text-white hover:bg-brand/90">
                        <Plus className="mr-2 h-4 w-4 shrink-0" /> Nueva Reserva
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2 sm:flex">
                            <TabsTrigger value="calendar" className="px-3"><Calendar className="mr-2 h-4 w-4 shrink-0" /> Calendario</TabsTrigger>
                            <TabsTrigger value="list" className="px-3"><FileText className="mr-2 h-4 w-4 shrink-0" /> Lista</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="shrink-0"><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="min-w-[140px] text-center text-sm font-medium">{format(today, "EEEE, MMM d, yyyy")}</span>
                        <Button variant="outline" size="icon" className="shrink-0"><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-xs text-slate-500">Hoy</Button>
                    </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-500"><Filter className="h-4 w-4 shrink-0" /><span>Filtros:</span></div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={staffFilter} onValueChange={setStaffFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-[160px]"><SelectValue placeholder="Todo el Personal" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todo el Personal</SelectItem>
                                {MOCK_STAFF.filter((s) => s.bookable).map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Todos los Estados" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los Estados</SelectItem>
                                <SelectItem value="PENDING">Pendiente</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                                <SelectItem value="COMPLETED">Completada</SelectItem>
                                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                        {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" className="text-xs text-slate-500" onClick={() => { setStaffFilter("ALL"); setStatusFilter("ALL"); }}>
                                <X className="mr-1 h-3 w-3 shrink-0" /> Limpiar ({activeFilterCount})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking list */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">No se encontraron reservas.</p>
                ) : filtered.map((booking) => (
                    <Card key={booking.id} className="cursor-pointer border-slate-200 transition-colors hover:border-slate-300" onClick={() => setSelectedBooking(booking)}>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-semibold text-slate-900">{booking.time}</span>
                                        <span className="text-[10px] text-slate-400">{booking.endTime}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900">{booking.client}</p>
                                        <p className="text-xs text-slate-500">{booking.service} · {booking.staff}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                                            <span className="text-xs text-slate-400">{booking.phone}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400">{booking.date}</span>
                                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(booking.price)}</span>
                                    <Badge className={cn("text-[10px]", getStatusColor(booking.status))}>{getStatusLabel(booking.status)}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Booking detail dialog */}
            <Dialog open={!!selectedBooking} onOpenChange={(open) => { if (!open) setSelectedBooking(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Reserva</DialogTitle>
                        <DialogDescription>Reserva #{selectedBooking?.id}</DialogDescription>
                    </DialogHeader>
                    {selectedBooking && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-slate-500">Cliente</span><p className="font-medium">{selectedBooking.client}</p></div>
                                <div><span className="text-slate-500">Servicio</span><p className="font-medium">{selectedBooking.service}</p></div>
                                <div><span className="text-slate-500">Personal</span><p className="font-medium">{selectedBooking.staff}</p></div>
                                <div><span className="text-slate-500">Precio</span><p className="font-medium">{formatCurrency(selectedBooking.price)}</p></div>
                                <div><span className="text-slate-500">Fecha</span><p className="font-medium">{selectedBooking.date}</p></div>
                                <div><span className="text-slate-500">Hora</span><p className="font-medium">{selectedBooking.time} - {selectedBooking.endTime}</p></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Estado:</span>
                                <Badge className={cn("text-xs", getStatusColor(selectedBooking.status))}>{getStatusLabel(selectedBooking.status)}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedBooking.status === "PENDING" && (
                                    <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleStatusChange(selectedBooking.id, "CONFIRMED")}>
                                        <Check className="mr-1 h-3 w-3 shrink-0" /> Confirmar
                                    </Button>
                                )}
                                {selectedBooking.status === "CONFIRMED" && (
                                    <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => handleStatusChange(selectedBooking.id, "COMPLETED")}>
                                        <Check className="mr-1 h-3 w-3 shrink-0" /> Completar
                                    </Button>
                                )}
                                {(selectedBooking.status === "PENDING" || selectedBooking.status === "CONFIRMED") && (
                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleStatusChange(selectedBooking.id, "CANCELLED")}>
                                        <X className="mr-1 h-3 w-3 shrink-0" /> Cancelar
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ================================================================== */
/*  SERVICES TAB                                                       */
/* ================================================================== */

function DemoServicesTab() {
    const [services, setServices] = useState(MOCK_SERVICES);
    const [search, setSearch] = useState("");
    const [editingService, setEditingService] = useState<MockService | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formName, setFormName] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formDuration, setFormDuration] = useState(30);
    const [formCategory, setFormCategory] = useState("1");
    const [formActive, setFormActive] = useState(true);

    const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

    const openNew = () => {
        setEditingService(null);
        setFormName(""); setFormDesc(""); setFormPrice(""); setFormDuration(30); setFormCategory("1"); setFormActive(true);
        setIsDialogOpen(true);
    };

    const openEdit = (service: MockService) => {
        setEditingService(service);
        setFormName(service.name); setFormDesc(service.description); setFormPrice((service.price / 100).toFixed(2)); setFormDuration(service.duration); setFormCategory(service.category_id.toString()); setFormActive(service.active);
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        const priceCents = Math.round(parseFloat(formPrice || "0") * 100);
        const cat = MOCK_CATEGORIES.find((c) => c.id.toString() === formCategory);
        if (editingService) {
            setServices((prev) => prev.map((s) => s.id === editingService.id ? { ...s, name: formName, description: formDesc, price: priceCents, duration: formDuration, category: cat?.name || s.category, category_id: parseInt(formCategory), active: formActive } : s));
        } else {
            const newService: MockService = { id: Date.now(), name: formName, description: formDesc, price: priceCents, duration: formDuration, category: cat?.name || "Cabello", category_id: parseInt(formCategory), active: formActive };
            setServices((prev) => [...prev, newService]);
        }
        setIsDialogOpen(false);
    };

    const handleDelete = (id: number) => setServices((prev) => prev.filter((s) => s.id !== id));
    const handleToggle = (id: number) => setServices((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Servicios</h1><p className="text-slate-500">{services.length} servicios configurados</p></div>
                <Button className="bg-brand text-white hover:bg-brand/90" onClick={openNew}><Plus className="mr-2 h-4 w-4 shrink-0" /> Agregar Servicio</Button>
            </div>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar servicios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
                <Table>
                    <TableHeader><TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-semibold uppercase">Servicio</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Categoría</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase">Precio</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase">Duración</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase">Estado</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase">Acciones</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {filtered.map((service) => (
                            <TableRow key={service.id} className="hover:bg-slate-50">
                                <TableCell><p className="font-medium text-slate-900">{service.name}</p><p className="text-xs text-slate-400">{service.description}</p></TableCell>
                                <TableCell className="text-sm text-slate-600">{service.category}</TableCell>
                                <TableCell className="text-right text-sm font-medium text-slate-900">{formatCurrency(service.price)}</TableCell>
                                <TableCell className="text-right text-sm text-slate-600">{service.duration} min</TableCell>
                                <TableCell className="text-center"><Switch checked={service.active} onCheckedChange={() => handleToggle(service.id)} /></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(service)}><Pencil className="h-3.5 w-3.5 shrink-0" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(service.id)}><Trash2 className="h-3.5 w-3.5 shrink-0" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="space-y-2 md:hidden">
                {filtered.map((service) => (
                    <Card key={service.id} className="border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-slate-900">{service.name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{service.category} · {service.duration} min</p>
                                </div>
                                <div className="ml-3 text-right">
                                    <p className="font-semibold text-slate-900">{formatCurrency(service.price)}</p>
                                    <Switch checked={service.active} onCheckedChange={() => handleToggle(service.id)} className="mt-1" />
                                </div>
                            </div>
                            <div className="mt-2 flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(service)}><Pencil className="mr-1 h-3 w-3 shrink-0" /> Editar</Button>
                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(service.id)}><Trash2 className="mr-1 h-3 w-3 shrink-0" /> Eliminar</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle><DialogDescription>{editingService ? "Modifica los datos del servicio" : "Crea un nuevo servicio para tus clientes"}</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Nombre</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
                        <div><Label>Descripción</Label><Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Precio ($)</Label><Input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} /></div>
                            <div><Label>Duración (min)</Label><Input type="number" value={formDuration} onChange={(e) => setFormDuration(parseInt(e.target.value) || 30)} /></div>
                        </div>
                        <div><Label>Categoría</Label><Select value={formCategory} onValueChange={setFormCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MOCK_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="flex items-center gap-2"><Switch checked={formActive} onCheckedChange={setFormActive} /><Label>Activo</Label></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button className="bg-brand text-white hover:bg-brand/90" onClick={handleSave}>Guardar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ================================================================== */
/*  STAFF TAB                                                          */
/* ================================================================== */

function DemoStaffTab() {
    const [staff, setStaff] = useState(MOCK_STAFF);
    const [search, setSearch] = useState("");
    const filtered = staff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

    const toggleBookable = (id: number) => setStaff((prev) => prev.map((s) => s.id === id ? { ...s, bookable: !s.bookable } : s));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Personal</h1><p className="text-slate-500">{staff.length} miembros del equipo</p></div>
                <Button className="bg-brand text-white hover:bg-brand/90"><Plus className="mr-2 h-4 w-4 shrink-0" /> Invitar Personal</Button>
            </div>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar personal..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((member) => (
                    <Card key={member.id} className="border-slate-200 overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-brand to-pink-500" />
                        <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">{member.name.charAt(0)}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900">{member.name}</p>
                                    <div className="mt-0.5 flex items-center gap-1"><Mail className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate text-xs text-slate-500">{member.email}</span></div>
                                    <p className="mt-1 text-xs text-slate-400">{member.bio}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">{member.role}</Badge>
                                    <Badge className={cn("text-[10px]", member.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{member.status}</Badge>
                                </div>
                                <span className="text-xs text-slate-500">{member.services.length} servicios</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-2"><Switch checked={member.bookable} onCheckedChange={() => toggleBookable(member.id)} /><Label className="text-xs">Reservable</Label></div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5 shrink-0" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-3.5 w-3.5 shrink-0" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

/* ================================================================== */
/*  CUSTOMERS TAB                                                      */
/* ================================================================== */

function DemoCustomersTab() {
    const [search, setSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<MockCustomer | null>(null);
    const filtered = MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clientes</h1><p className="text-slate-500">{MOCK_CUSTOMERS.length} clientes registrados</p></div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4 shrink-0" /> Exportar</Button>
                    <Button variant="outline" size="sm"><Upload className="mr-1 h-4 w-4 shrink-0" /> Importar</Button>
                    <Button size="sm" className="bg-brand text-white hover:bg-brand/90"><Send className="mr-1 h-4 w-4 shrink-0" /> Mensaje Masivo</Button>
                </div>
            </div>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
                <Table>
                    <TableHeader><TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-semibold uppercase">Cliente</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Preferencia</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Reservas</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase">Gasto Total</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Próxima Cita</TableHead>
                        <TableHead className="text-xs font-semibold uppercase">Staff Favorito</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase">Acciones</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {filtered.map((customer) => (
                            <TableRow key={customer.id} className="hover:bg-slate-50">
                                <TableCell>
                                    <p className="font-medium text-slate-900">{customer.name}</p>
                                    <p className="text-xs text-slate-400">{customer.phone}</p>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600">{customer.preference}</TableCell>
                                <TableCell>
                                    <span className="text-sm font-medium">{customer.bookings}</span>
                                    <span className="ml-1 text-xs text-slate-400">({customer.completed}✓ {customer.cancelled}✗ {customer.noShow}⊘)</span>
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium text-emerald-700">{formatCurrency(customer.spent)}</TableCell>
                                <TableCell className="text-xs text-slate-600">{customer.nextBooking ? formatDate(customer.nextBooking) : "—"}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1"><Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" /><span className="text-xs text-slate-600">{customer.favoriteStaff}</span></div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCustomer(customer)}><Eye className="h-3.5 w-3.5 shrink-0" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="space-y-2 md:hidden">
                {filtered.map((customer) => (
                    <Card key={customer.id} className="cursor-pointer border-slate-200" onClick={() => setSelectedCustomer(customer)}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div><p className="font-medium text-slate-900">{customer.name}</p><p className="mt-0.5 text-xs text-slate-500">{customer.phone} · {customer.preference}</p></div>
                                <div className="text-right"><p className="text-sm font-semibold text-emerald-700">{formatCurrency(customer.spent)}</p><p className="mt-0.5 text-xs text-slate-500">{customer.bookings} reservas</p></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Dialog open={!!selectedCustomer} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>{selectedCustomer?.name}</DialogTitle><DialogDescription>{selectedCustomer?.email} · {selectedCustomer?.phone}</DialogDescription></DialogHeader>
                    {selectedCustomer && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Total Reservas</span><p className="text-lg font-bold text-slate-900">{selectedCustomer.bookings}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Gasto Total</span><p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedCustomer.spent)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Ticket Promedio</span><p className="text-lg font-bold text-slate-900">{formatCurrency(selectedCustomer.avgTicket)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Última Visita</span><p className="text-lg font-bold text-slate-900">{formatDate(selectedCustomer.lastVisit)}</p></div>
                            <div><span className="text-xs text-slate-500">Completadas</span><p className="font-medium text-emerald-600">{selectedCustomer.completed}</p></div>
                            <div><span className="text-xs text-slate-500">Canceladas</span><p className="font-medium text-red-600">{selectedCustomer.cancelled}</p></div>
                            <div><span className="text-xs text-slate-500">No Asistió</span><p className="font-medium text-slate-600">{selectedCustomer.noShow}</p></div>
                            <div><span className="text-xs text-slate-500">Staff Favorito</span><p className="font-medium">{selectedCustomer.favoriteStaff}</p></div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ================================================================== */
/*  AVAILABILITY TAB                                                   */
/* ================================================================== */

function DemoAvailability() {
    const [selectedStaff, setSelectedStaff] = useState("1");
    const [availability, setAvailability] = useState(MOCK_AVAILABILITY);
    const [timeOff] = useState(MOCK_TIME_OFF);

    const addSlot = (dayIndex: number) => {
        setAvailability((prev) => prev.map((d, i) => i === dayIndex ? { ...d, slots: [...d.slots, { start_time: "09:00", end_time: "17:00" }] } : d));
    };

    const removeSlot = (dayIndex: number, slotIndex: number) => {
        setAvailability((prev) => prev.map((d, i) => i === dayIndex ? { ...d, slots: d.slots.filter((_, si) => si !== slotIndex) } : d));
    };

    const updateSlot = (dayIndex: number, slotIndex: number, field: "start_time" | "end_time", value: string) => {
        setAvailability((prev) => prev.map((d, i) => i === dayIndex ? { ...d, slots: d.slots.map((s, si) => si === slotIndex ? { ...s, [field]: value } : s) } : d));
    };

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Disponibilidad</h1><p className="text-slate-500">Gestiona los horarios individuales de tu personal.</p></div>
            <div className="max-w-xs"><Label>Miembro del personal</Label><Select value={selectedStaff} onValueChange={setSelectedStaff}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{MOCK_STAFF.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <Card className="border-slate-200">
                <CardHeader><CardTitle>Horario Semanal</CardTitle><CardDescription>Configura las franjas horarias disponibles para cada día.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    {availability.map((day, dayIndex) => (
                        <div key={day.day} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-900">{day.label}</span>
                                <Button variant="ghost" size="sm" onClick={() => addSlot(dayIndex)}><Plus className="mr-1 h-3 w-3 shrink-0" /> Agregar franja</Button>
                            </div>
                            {day.slots.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-400">Sin disponibilidad</p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {day.slots.map((slot, slotIndex) => (
                                        <div key={slotIndex} className="flex items-center gap-2">
                                            <Input type="time" value={slot.start_time} onChange={(e) => updateSlot(dayIndex, slotIndex, "start_time", e.target.value)} className="h-9 w-[120px]" />
                                            <span className="text-slate-400">—</span>
                                            <Input type="time" value={slot.end_time} onChange={(e) => updateSlot(dayIndex, slotIndex, "end_time", e.target.value)} className="h-9 w-[120px]" />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeSlot(dayIndex, slotIndex)}><Trash2 className="h-3.5 w-3.5 shrink-0" /></Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Cambios</Button>
                </CardContent>
            </Card>
            <Card className="border-slate-200">
                <CardHeader><CardTitle>Solicitudes de Tiempo Libre</CardTitle></CardHeader>
                <CardContent>
                    {timeOff.length === 0 ? <p className="text-sm text-slate-500">Sin solicitudes.</p> : (
                        <div className="space-y-3">
                            {timeOff.map((req) => (
                                <div key={req.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{req.staff}</p>
                                        <p className="text-xs text-slate-500">{req.reason}</p>
                                        <p className="mt-1 text-xs text-slate-400">{new Date(req.starts_at).toLocaleString("es")} — {new Date(req.ends_at).toLocaleString("es")}</p>
                                    </div>
                                    <Badge className={cn("text-xs", req.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : req.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>{req.status === "APPROVED" ? "Aprobado" : req.status === "PENDING" ? "Pendiente" : "Rechazado"}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/* ================================================================== */
/*  HOURS TAB                                                          */
/* ================================================================== */

function DemoHours() {
    const [hours, setHours] = useState(MOCK_HOURS);

    const toggleDay = (dayIndex: number) => {
        setHours((prev) => prev.map((d, i) => i === dayIndex ? { ...d, is_open: !d.is_open, slots: !d.is_open && d.slots.length === 0 ? [{ start_time: "09:00", end_time: "17:00" }] : d.slots } : d));
    };

    const addSlot = (dayIndex: number) => {
        setHours((prev) => prev.map((d, i) => i === dayIndex ? { ...d, slots: [...d.slots, { start_time: "09:00", end_time: "17:00" }] } : d));
    };

    const removeSlot = (dayIndex: number, slotIndex: number) => {
        setHours((prev) => prev.map((d, i) => i === dayIndex ? { ...d, slots: d.slots.filter((_, si) => si !== slotIndex) } : d));
    };

    const updateSlot = (dayIndex: number, slotIndex: number, field: "start_time" | "end_time", value: string) => {
        setHours((prev) => prev.map((d, i) => i === dayIndex ? { ...d, slots: d.slots.map((s, si) => si === slotIndex ? { ...s, [field]: value } : s) } : d));
    };

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Horario de Atención</h1><p className="text-slate-500">Configura los horarios de apertura de tu negocio.</p></div>
            <Card className="border-slate-200">
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 shrink-0 text-brand" /> Horario Semanal</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {hours.map((day, dayIndex) => (
                        <div key={day.day} className={cn("rounded-lg border p-4 transition-colors", day.is_open ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50")}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Switch checked={day.is_open} onCheckedChange={() => toggleDay(dayIndex)} />
                                    <span className={cn("text-sm font-semibold", day.is_open ? "text-slate-900" : "text-slate-400")}>{day.name}</span>
                                </div>
                                {day.is_open && <Button variant="ghost" size="sm" onClick={() => addSlot(dayIndex)}><Plus className="mr-1 h-3 w-3 shrink-0" /> Franja</Button>}
                            </div>
                            {day.is_open && day.slots.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {day.slots.map((slot, slotIndex) => (
                                        <div key={slotIndex} className="flex items-center gap-2">
                                            <Input type="time" value={slot.start_time} onChange={(e) => updateSlot(dayIndex, slotIndex, "start_time", e.target.value)} className="h-9 w-[120px]" />
                                            <span className="text-slate-400">—</span>
                                            <Input type="time" value={slot.end_time} onChange={(e) => updateSlot(dayIndex, slotIndex, "end_time", e.target.value)} className="h-9 w-[120px]" />
                                            {day.slots.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeSlot(dayIndex, slotIndex)}><Trash2 className="h-3.5 w-3.5 shrink-0" /></Button>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {day.is_open && day.slots.length === 0 && <p className="mt-2 text-xs text-slate-400">Agrega una franja horaria</p>}
                        </div>
                    ))}
                    <Button className="mt-4 bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Horario</Button>
                </CardContent>
            </Card>
        </div>
    );
}

/* ================================================================== */
/*  THEME TAB                                                          */
/* ================================================================== */

function DemoTheme() {
    const [brandColor, setBrandColor] = useState("#e73886");
    const [bgPreset, setBgPreset] = useState("warm-cream");
    const [cornerRadius, setCornerRadius] = useState("md");
    const [cardsElevated, setCardsElevated] = useState(true);
    const [heroVariant, setHeroVariant] = useState("hero-cinematic");
    const [servicesVariant, setServicesVariant] = useState("services-grid");
    const [teamVariant, setTeamVariant] = useState("team-cards");

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tema</h1><p className="text-slate-500">Personaliza la apariencia de tu tienda pública.</p></div>
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 shrink-0 text-brand" /> Colores</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Color de Marca</Label><div className="mt-1 flex items-center gap-3"><Input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-14 cursor-pointer p-1" /><Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-[120px] font-mono text-sm" /></div></div>
                            <div><Label>Fondo de Página</Label><Select value={bgPreset} onValueChange={setBgPreset}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warm-cream">Crema Cálido</SelectItem><SelectItem value="cool-gray">Gris Frío</SelectItem><SelectItem value="pure-white">Blanco Puro</SelectItem><SelectItem value="soft-pink">Rosa Suave</SelectItem></SelectContent></Select></div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Estilo</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Radio de Esquinas</Label><Select value={cornerRadius} onValueChange={setCornerRadius}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin radio</SelectItem><SelectItem value="sm">Pequeño</SelectItem><SelectItem value="md">Mediano</SelectItem><SelectItem value="lg">Grande</SelectItem><SelectItem value="xl">Extra Grande</SelectItem></SelectContent></Select></div>
                            <div className="flex items-center gap-2"><Switch checked={cardsElevated} onCheckedChange={setCardsElevated} /><Label>Cards con sombra</Label></div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Variantes de Sección</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Hero</Label><Select value={heroVariant} onValueChange={setHeroVariant}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hero-cinematic">Cinemático</SelectItem><SelectItem value="hero-minimal">Minimalista</SelectItem><SelectItem value="hero-bold">Bold</SelectItem></SelectContent></Select></div>
                            <div><Label>Servicios</Label><Select value={servicesVariant} onValueChange={setServicesVariant}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="services-grid">Grilla</SelectItem><SelectItem value="services-list">Lista</SelectItem><SelectItem value="services-cards">Cards</SelectItem></SelectContent></Select></div>
                            <div><Label>Equipo</Label><Select value={teamVariant} onValueChange={setTeamVariant}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="team-cards">Cards</SelectItem><SelectItem value="team-grid">Grilla</SelectItem><SelectItem value="team-list">Lista</SelectItem></SelectContent></Select></div>
                        </CardContent>
                    </Card>
                    <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Tema</Button>
                </div>
                <div>
                    <Card className="sticky top-4 border-slate-200">
                        <CardHeader><CardTitle>Vista Previa</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                                <div className="h-32 rounded-lg" style={{ backgroundColor: brandColor, opacity: 0.15 }}>
                                    <div className="flex h-full items-center justify-center">
                                        <div className="text-center"><div className="text-lg font-bold" style={{ color: brandColor }}>Bella Studio</div><p className="mt-1 text-xs text-slate-500">Tu salón de confianza</p></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Corte", "Tinte", "Manicure", "Peinado"].map((s) => (
                                        <div key={s} className={cn("rounded border border-slate-200 p-3 text-center text-xs", cardsElevated && "shadow-sm")}>
                                            <div className="h-1 w-8 mx-auto rounded-full mb-2" style={{ backgroundColor: brandColor }} />
                                            {s}
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full text-xs text-white" style={{ backgroundColor: brandColor }}>Reservar Ahora</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/*  SETTINGS TAB                                                       */
/* ================================================================== */

function DemoSettings() {
    const [companyName, setCompanyName] = useState("Bella Studio");
    const [companyEmail, setCompanyEmail] = useState("hola@bellastudio.com");
    const [companyPhone, setCompanyPhone] = useState("72345678");
    const [address, setAddress] = useState("Av. Monseñor Rivero #300");
    const [city, setCity] = useState("Santa Cruz de la Sierra");
    const [bufferMinutes, setBufferMinutes] = useState(15);
    const [granularity, setGranularity] = useState(30);
    const [cancelLimit, setCancelLimit] = useState(120);
    const [autoApprove, setAutoApprove] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [whatsappNotifications, setWhatsappNotifications] = useState(true);
    const [cashPayments, setCashPayments] = useState(true);
    const [qrPayments, setQrPayments] = useState(true);

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Configuración</h1><p className="text-slate-500">Administra la configuración de tu negocio.</p></div>
            <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:w-auto lg:grid-cols-none lg:flex">
                    <TabsTrigger value="general"><Building2 className="mr-1.5 h-4 w-4 shrink-0 hidden sm:block" /> General</TabsTrigger>
                    <TabsTrigger value="booking"><CalendarClock className="mr-1.5 h-4 w-4 shrink-0 hidden sm:block" /> Reservas</TabsTrigger>
                    <TabsTrigger value="payments"><CreditCard className="mr-1.5 h-4 w-4 shrink-0 hidden sm:block" /> Pagos</TabsTrigger>
                    <TabsTrigger value="social"><Share2 className="mr-1.5 h-4 w-4 shrink-0 hidden sm:block" /> Social</TabsTrigger>
                    <TabsTrigger value="subscription"><Globe className="mr-1.5 h-4 w-4 shrink-0 hidden sm:block" /> Plan</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-6 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Nombre del Negocio</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Email</Label><Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="mt-1" /></div>
                                <div><Label>Teléfono</Label><Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="mt-1" /></div>
                            </div>
                            <div><Label>Dirección</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" /></div>
                            <div><Label>Ciudad</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" /></div>
                        </CardContent>
                    </Card>
                    <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Cambios</Button>
                </TabsContent>
                <TabsContent value="booking" className="mt-6 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Reglas de Reserva</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Buffer entre citas (min)</Label><Input type="number" value={bufferMinutes} onChange={(e) => setBufferMinutes(parseInt(e.target.value) || 0)} className="mt-1" /></div>
                                <div><Label>Intervalo de slots (min)</Label><Input type="number" value={granularity} onChange={(e) => setGranularity(parseInt(e.target.value) || 15)} className="mt-1" /></div>
                            </div>
                            <div><Label>Límite de cancelación (min antes)</Label><Input type="number" value={cancelLimit} onChange={(e) => setCancelLimit(parseInt(e.target.value) || 0)} className="mt-1" /></div>
                            <div className="flex items-center gap-2"><Switch checked={autoApprove} onCheckedChange={setAutoApprove} /><Label>Aprobación automática de reservas</Label></div>
                        </CardContent>
                    </Card>
                    <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Cambios</Button>
                </TabsContent>
                <TabsContent value="payments" className="mt-6 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Métodos de Pago</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4"><div><p className="font-medium">Efectivo</p><p className="text-xs text-slate-500">Acepta pagos en efectivo</p></div><Switch checked={cashPayments} onCheckedChange={setCashPayments} /></div>
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4"><div><p className="font-medium">Pago QR</p><p className="text-xs text-slate-500">Acepta pagos por QR</p></div><Switch checked={qrPayments} onCheckedChange={setQrPayments} /></div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Notificaciones</CardTitle><CardDescription>Configura notificaciones automáticas</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-500" /><div><p className="font-medium">Notificaciones por Email</p><p className="text-xs text-slate-500">Envía confirmaciones de reserva por email</p></div></div><Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} /></div>
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0 text-emerald-500" /><div><p className="font-medium">Notificaciones por WhatsApp</p><p className="text-xs text-slate-500">Envía actualizaciones por WhatsApp</p></div></div><Switch checked={whatsappNotifications} onCheckedChange={setWhatsappNotifications} /></div>
                        </CardContent>
                    </Card>
                    <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Cambios</Button>
                </TabsContent>
                <TabsContent value="social" className="mt-6 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Redes Sociales</CardTitle><CardDescription>Agrega links a tus redes sociales</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Instagram</Label><Input placeholder="https://instagram.com/bellastudio" className="mt-1" /></div>
                            <div><Label>Facebook</Label><Input placeholder="https://facebook.com/bellastudio" className="mt-1" /></div>
                            <div><Label>TikTok</Label><Input placeholder="https://tiktok.com/@bellastudio" className="mt-1" /></div>
                            <div><Label>WhatsApp</Label><Input placeholder="https://wa.me/59172345678" className="mt-1" /></div>
                        </CardContent>
                    </Card>
                    <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Cambios</Button>
                </TabsContent>
                <TabsContent value="subscription" className="mt-6 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Plan Actual</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between rounded-lg border border-brand/20 bg-brand/5 p-4">
                                <div><p className="text-lg font-bold text-slate-900">Plan BUSINESS</p><p className="text-sm text-slate-500">Hasta 10 miembros de staff · Todas las funciones principales</p></div>
                                <Badge className="bg-brand text-white">Activo</Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardHeader><CardTitle>Historial de Suscripción</CardTitle></CardHeader>
                        <CardContent>
                            <Table><TableHeader><TableRow><TableHead className="text-xs">Fecha</TableHead><TableHead className="text-xs">Plan</TableHead><TableHead className="text-xs">Cambio</TableHead><TableHead className="text-right text-xs">Monto</TableHead></TableRow></TableHeader><TableBody>
                                <TableRow><TableCell className="text-xs">1 mar 2026</TableCell><TableCell className="text-xs">BUSINESS</TableCell><TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">Renovación</Badge></TableCell><TableCell className="text-right text-xs font-medium">$45.00</TableCell></TableRow>
                                <TableRow><TableCell className="text-xs">1 feb 2026</TableCell><TableCell className="text-xs">BUSINESS</TableCell><TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">Renovación</Badge></TableCell><TableCell className="text-right text-xs font-medium">$45.00</TableCell></TableRow>
                                <TableRow><TableCell className="text-xs">15 ene 2026</TableCell><TableCell className="text-xs">STARTER → BUSINESS</TableCell><TableCell className="text-xs"><Badge className="bg-emerald-100 text-[10px] text-emerald-800">Upgrade</Badge></TableCell><TableCell className="text-right text-xs font-medium">$45.00</TableCell></TableRow>
                                <TableRow><TableCell className="text-xs">15 dic 2025</TableCell><TableCell className="text-xs">STARTER</TableCell><TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">Inicio</Badge></TableCell><TableCell className="text-right text-xs font-medium">$25.00</TableCell></TableRow>
                            </TableBody></Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/* ================================================================== */
/*  PROFILE TAB                                                        */
/* ================================================================== */

function DemoProfile() {
    const [firstName, setFirstName] = useState("Bella");
    const [lastName, setLastName] = useState("Dueña");
    const [email] = useState("bella@bellastudio.com");
    const [phonePrefix] = useState("591");
    const [phone, setPhone] = useState("72345678");
    const [displayName, setDisplayName] = useState("Bella D.");
    const [bio, setBio] = useState("Fundadora y estilista principal de Bella Studio.");

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mi Perfil</h1><p className="text-slate-500">Gestiona tu información personal.</p></div>
            <Card className="border-slate-200">
                <CardHeader><CardTitle>Información Personal</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Nombre</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" /></div>
                        <div><Label>Apellido</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" /></div>
                    </div>
                    <div><Label>Email</Label><Input value={email} disabled className="mt-1 bg-slate-50" /></div>
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                        <div><Label>Prefijo</Label><Input value={`+${phonePrefix}`} disabled className="mt-1 bg-slate-50" /></div>
                        <div><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-slate-200">
                <CardHeader><CardTitle>Perfil Público</CardTitle><CardDescription>Información visible para los clientes</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div><Label>Nombre para mostrar</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" /></div>
                    <div><Label>Biografía</Label><textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" rows={3} /></div>
                </CardContent>
            </Card>
            <Button className="bg-brand text-white hover:bg-brand/90"><Save className="mr-2 h-4 w-4 shrink-0" /> Guardar Perfil</Button>
        </div>
    );
}
