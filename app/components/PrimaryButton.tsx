import { Button } from "@/components/ui/button";
type ButtonProps = React.ComponentProps<typeof Button>;
import { cn } from "@/lib/utils";

export const PrimaryButton = ({ className, ...props }: ButtonProps) => (
  <Button
    className={cn(
      "inline-flex min-w-[160px] items-center justify-center rounded-md bg-brand px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
);