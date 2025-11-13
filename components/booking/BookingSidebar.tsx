"use client";

import Button from "@/components/ui/Button";

interface BookingSidebarProps {
  // Props for the booking summary will be added here
}

const BookingSidebar = ({}: BookingSidebarProps) => {
  return (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
      <div className="sticky top-8 flex flex-col gap-4 p-5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-[#0d141b] dark:text-white">
          Your Booking
        </h3>
        <div className="flex flex-col gap-3 border-t border-b border-slate-200 dark:border-slate-800 py-4">
          {/* Selected services will be mapped here */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-slate-500 dark:text-slate-400">
                content_cut
              </span>
              <span className="text-base text-slate-700 dark:text-slate-300">
                Men's Haircut
              </span>
            </div>
            <span className="font-medium text-[#0d141b] dark:text-white">
              $45
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center font-bold">
          <span className="text-base text-[#0d141b] dark:text-white">
            Total
          </span>
          <span className="text-lg text-[#0d141b] dark:text-white">$45</span>
        </div>
        <Button>Continue</Button>
      </div>
    </aside>
  );
};

export default BookingSidebar;
