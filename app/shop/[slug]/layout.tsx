import { ShopProvider } from "../contexts/ShopContext";
import { ShopNavbar } from "../components/ShopNavbar";

type ShopLayoutProps = {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
};

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
    const { slug } = await params;

    return (
        <ShopProvider slug={slug}>
            <ShopNavbar />
            {children}
        </ShopProvider>
    );
}
