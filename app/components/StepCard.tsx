
interface StepCardProps {
    stepNumber: number;
    title: string;
    description: string;
    icon: React.ReactNode;
  }
  
  export function StepCard({ stepNumber, title, description, icon }: StepCardProps) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
          {icon}
        </div>
        <h3 className="mb-2 text-xl font-bold">
          <span className="text-gray-400 dark:text-gray-500">{stepNumber}.</span> {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    );
  }
