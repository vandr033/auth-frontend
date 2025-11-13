"use client";

import Button from "@/components/ui/Button";

interface BookingSummaryProps {
  selectedServices: {
    id: string;
    name: string;
    price: number;
    duration: number;
  }[];
  onRemoveService: (serviceId: string) => void;
}

const BookingSummary = ({
  selectedServices,
  onRemoveService,
}: BookingSummaryProps) => {
  const subtotal = selectedServices.reduce(
    (acc, service) => acc + service.price,
    0
  );
  const totalDuration = selectedServices.reduce(
    (acc, service) => acc + service.duration,
    0
  );

  return (
    <div className="sticky top-8 bg-white dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700/50">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
        Your Appointment
      </h2>
      <div className="space-y-4">
        {selectedServices.length > 0 ? (
          selectedServices.map((service) => (
            <div
              key={service.id}
              className="flex items-start justify-between gap-4"
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {service.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {service.duration} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  ${service.price}
                </p>
                <button
                  onClick={() => onRemoveService(service.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    close
                  </span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-slate-500 dark:text-slate-400">
              Your selected services will appear here.
            </p>
          </div>
        )}
      </div>
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 dark:text-slate-400">Total Time Est.</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {totalDuration} min
            </p>
          </div>
          <div className="flex justify-between items-center text-lg">
            <p className="font-bold text-slate-900 dark:text-white">Subtotal</p>
            <p className="font-bold text-slate-900 dark:text-white">
              ${subtotal.toFixed(2)}
            </p>
          </div>
        </div>
        <Button
          className="mt-6 w-full"
          disabled={selectedServices.length === 0}
        >
          Continue to Booking
        </Button>
      </div>
    </div>
  );
};

export default BookingSummary;
