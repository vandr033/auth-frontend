import { RestaurantReservationDetail } from "../../RestaurantOperations";
import { RestaurantNotificationPanel } from "../../RestaurantNotificationPanel";
export default async function RestaurantReservationPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const reservationId = Number(id); return <><RestaurantReservationDetail id={reservationId} /><div className="mx-auto -mt-5 max-w-3xl pb-10"><RestaurantNotificationPanel reservationId={reservationId} /></div></>; }
