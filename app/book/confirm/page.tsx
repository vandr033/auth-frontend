"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BookingSidebar from "@/components/booking/BookingSidebar";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function ConfirmPage() {
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
            <Link
              href="/book/time"
              className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal"
            >
              Time
            </Link>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">
              /
            </span>
            <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
              Confirm
            </span>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <BookingSidebar />
            <div className="w-full lg:col-span-2">
              <div className="flex flex-wrap justify-between gap-3 px-0 py-4 md:px-4">
                <div className="flex min-w-72 flex-col gap-2">
                  <p className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                    Confirm Your Appointment
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                    Please review your booking details below.
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-background-dark p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  Your Information
                </h3>
                <form className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" className="w-full">
                      Confirm Booking
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
