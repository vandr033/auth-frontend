// barber-shop layout
import { Navbar } from '../../components/navbar'
import React from 'react'

export default function barberShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="w-full">
            {children}
        </div>
    );
}
