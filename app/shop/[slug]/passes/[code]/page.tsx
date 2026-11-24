import { PassReservationStatus } from "../PassReservationStatus";

export default async function PassReservationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PassReservationStatus code={code} />;
}
