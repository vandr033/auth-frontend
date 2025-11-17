'use client';
import React from 'react'
import Image from 'next/image'
import barberShop from '@/public/assets/barberShop.png'
export default function BarberShopPage() {
    return (
        <div className="flex flex-col min-h-screen ">
            {/*hero image div make it be 20 pixels below the top*/}
            <div className="flex flex-col h-[50vh] m-y-20 bg-black">
                {/* <Image src={barberShop} alt="barber shop" fill objectFit="contain" /> */}
            </div>
            
        </div>
    );
}