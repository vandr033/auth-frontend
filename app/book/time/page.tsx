"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BookingSidebar from "@/components/booking/BookingSidebar";
import Calendar from "@/components/booking/Calendar";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function SelectTimePage() {
  const timeSlots = [
    "9:00 AM",
    "9:45 AM",
    "10:30 AM",
    "11:15 AM",
    "12:00 PM",
    "1:30 PM",
    "2:15 PM",
    "3:00 PM",
    "3:45 PM",
    "4:30 PM",
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex w-full grow flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 px-0 py-4 md:px-4">
            <Link
              href="/book/service"
              className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal"
            >
              Service
            </Link>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">
              /
            </span>
            <Link
              href="/book/staff"
              className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal"
            >
              Staff
            </Link>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">
              /
            </span>
            <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
              Date & Time
            </span>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <BookingSidebar />
            <div className="w-full lg:col-span-2">
              <div className="flex flex-wrap justify-between gap-3 px-0 py-4 md:px-4">
                <div className="flex min-w-72 flex-col gap-2">
                  <p className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                    Select a Date & Time
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                    All times are in your local timezone.
                  </p>
                </div>
              </div>
              <Calendar />
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto mt-4">
                {timeSlots.map((time) => (
                  <Button key={time} variant="ghost" size="sm">
                    {time}
                  </Button>
                ))}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end mt-4">
                <Button>Next</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
