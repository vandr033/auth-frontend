import { RestaurantShiftEditorPage } from "../../RestaurantShifts";

export default async function RestaurantShiftDetailRoute({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RestaurantShiftEditorPage shiftId={Number(id)} />; }
