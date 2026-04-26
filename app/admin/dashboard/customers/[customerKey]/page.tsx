import { CustomerProfileSurface } from "../components/customer-surfaces";

export default async function CustomerProfilePage({
    params,
}: {
    params: Promise<{ customerKey: string }>;
}) {
    const { customerKey } = await params;
    return <CustomerProfileSurface customerKey={customerKey} />;
}
