import { RestaurantReservationForm } from "../../../RestaurantOperations";
export default async function EditRestaurantReservationPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RestaurantReservationForm reservationId={Number(id)} />; }
