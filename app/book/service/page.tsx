"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BookingSummary from "@/components/booking/BookingSummary";
import { mockData } from "@/lib/data";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function SelectServicePage() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const handleToggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getSelectedServiceDetails = () => {
    return mockData.services.filter((service) =>
      selectedServices.includes(service.id)
    );
  };

  const categories = [
    "All",
    ...new Set(mockData.services.map((s) => s.category)),
  ];
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredServices =
    activeCategory === "All"
      ? mockData.services
      : mockData.services.filter((s) => s.category === activeCategory);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <Header />
      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="text-primary/80 dark:text-primary/70 text-sm font-medium leading-normal hover:text-primary"
                href="/book/service"
              >
                Select Service
              </Link>
              <span className="text-slate-400 dark:text-slate-500 text-sm font-medium leading-normal">
                /
              </span>
              <span className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-normal">
                Select Date & Time
              </span>
            </div>
          </div>
          <header className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                Select Your Service(s)
              </h1>
            </div>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 xl:gap-12">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex gap-2 p-1 overflow-x-auto">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 ${
                        activeCategory === category
                          ? "bg-primary text-white"
                          : "bg-white dark:bg-background-dark dark:border dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium leading-normal ${
                          activeCategory !== category &&
                          "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {category}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col space-y-4">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-4 bg-white dark:bg-background-dark dark:border dark:border-slate-700/50 p-4 rounded-xl"
                  >
                    <div className="flex-1 flex items-start gap-4">
                      <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-[70px]"
                        style={{ backgroundImage: `url("${service.image}")` }}
                      ></div>
                      <div className="flex flex-1 flex-col justify-center">
                        <p className="text-slate-900 dark:text-white text-base font-bold leading-normal">
                          {service.name}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mt-1">
                          {service.duration} min • ${service.price}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal hidden sm:block">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button
                        variant={
                          selectedServices.includes(service.id)
                            ? "primary"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() => handleToggleService(service.id)}
                      >
                        {selectedServices.includes(service.id) ? (
                          <>
                            <span className="material-symbols-outlined text-base">
                              check
                            </span>
                            <span>Added</span>
                          </>
                        ) : (
                          <span>Add</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1 mt-8 lg:mt-0">
              <BookingSummary
                selectedServices={getSelectedServiceDetails()}
                onRemoveService={handleToggleService}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
