"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BookingSidebar from "@/components/booking/BookingSidebar";
import { mockData } from "@/lib/data";
import Link from "next/link";

export default function SelectStaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <Header />
      <main className="flex flex-1 justify-center py-5 sm:py-8 md:py-12">
        <div className="flex flex-col w-full max-w-4xl px-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Link
              href="/book/service"
              className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal"
            >
              Services
            </Link>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">
              /
            </span>
            <span className="text-[#0d141b] dark:text-white text-sm font-medium leading-normal">
              Staff
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">
              /
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal">
              Time
            </span>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-grow">
              <div className="flex flex-col gap-2 pb-6">
                <h1 className="text-[#0d141b] dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Choose Your Stylist
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-base">
                  Select a professional for your service.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div
                  className={`flex items-center gap-4 bg-white dark:bg-slate-900/50 px-4 min-h-[72px] py-3 justify-between border-2 rounded-xl shadow-sm ${
                    selectedStaff === "no-preference"
                      ? "border-primary"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-primary flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12">
                      <span className="material-symbols-outlined text-2xl">
                        spark
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[#0d141b] dark:text-white text-base font-bold leading-normal line-clamp-1">
                        No Preference
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal line-clamp-2">
                        We'll assign you to the first available expert.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="flex size-7 items-center justify-center">
                      <input
                        checked={selectedStaff === "no-preference"}
                        onChange={() => setSelectedStaff("no-preference")}
                        className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0"
                        name="stylist_selection"
                        type="radio"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockData.team.map((member) => (
                    <label
                      key={member.id}
                      className={`flex flex-col gap-3 text-center p-4 bg-white dark:bg-slate-900/50 rounded-xl border hover:border-primary dark:hover:border-primary cursor-pointer transition-colors ${
                        selectedStaff === member.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="px-4">
                        <div
                          className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-full"
                          style={{ backgroundImage: `url("${member.image}")` }}
                        ></div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-[#0d141b] dark:text-white text-base font-bold leading-normal">
                          {member.name}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-normal">
                          {member.title}
                        </p>
                        <p className="text-slate-500 dark:text-slate-500 text-sm font-normal leading-normal">
                          {member.rating} ★ ({member.reviews})
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal">
                          Next available: {member.availability}
                        </p>
                      </div>
                      <input
                        className="sr-only"
                        name="stylist_selection"
                        type="radio"
                        checked={selectedStaff === member.id}
                        onChange={() => setSelectedStaff(member.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <BookingSidebar />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
