

import { StepCard } from './StepCard';
import { Search, Calendar, CheckCircle } from 'lucide-react';

const steps = [
  {
    stepNumber: 1,
    title: 'Discover',
    description: 'Find the best salons and services that match your style and needs.',
    icon: <Search className="h-8 w-8" />,
  },
  {
    stepNumber: 2,
    title: 'Book',
    description: 'Choose your preferred date, time, and professional with just a few clicks.',
    icon: <Calendar className="h-8 w-8" />,
  },
  {
    stepNumber: 3,
    title: 'Show Up',
    description: "Relax and enjoy your service. We'll handle the reminders.",
    icon: <CheckCircle className="h-8 w-8" />,
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Book with Ease
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
            Booking your next appointment is as simple as 1, 2, 3.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <StepCard
              key={step.stepNumber}
              stepNumber={step.stepNumber}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
