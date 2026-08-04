import { RestaurantDashboardPage } from "./RestaurantOperations";
import { RestaurantDashboardSnapshot } from "./RestaurantDashboardSnapshot";
import Link from "next/link";
export default function RestaurantPage() { return <><RestaurantDashboardPage /><RestaurantDashboardSnapshot /><div className="mx-auto mt-4 flex max-w-7xl flex-wrap justify-end gap-4 px-4"><Link href="/admin/dashboard/restaurant/operations" className="text-sm font-semibold text-admin-brand hover:underline">Abrir operación de invitados →</Link><Link href="/admin/dashboard/restaurant/crm" className="text-sm font-semibold text-admin-brand hover:underline">Abrir CRM de huéspedes →</Link></div></>; }
