// barber-shop layout
import { Navbar } from '../components/navbar'
import React from 'react'

export default function barberShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className='w-full'>
                <Navbar />
                {children}
            </body>
        </html>
    );
}
