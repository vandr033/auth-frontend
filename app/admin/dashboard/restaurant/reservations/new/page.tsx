"use client";
import { useSearchParams } from "next/navigation";
import { RestaurantReservationForm } from "../../RestaurantOperations";
export default function NewRestaurantReservationPage() { const params = useSearchParams(); return <RestaurantReservationForm walkIn={params?.get("walkIn") === "1"} />; }
