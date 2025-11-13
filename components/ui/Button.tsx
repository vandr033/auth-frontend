import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseClasses =
      "flex items-center justify-center overflow-hidden rounded-lg font-bold leading-normal tracking-[0.015em] transition-colors";

    const variantClasses = {
      primary: "bg-primary text-white hover:bg-primary/90",
      secondary:
        "bg-white/20 text-white backdrop-blur-sm border border-white/30 hover:bg-white/30",
      ghost:
        "bg-primary/20 dark:bg-primary/30 text-primary hover:bg-primary/30 dark:hover:bg-primary/40",
    };

    const sizeClasses = {
      sm: "h-10 px-4 text-sm",
      md: "h-12 px-5 text-base",
      lg: "h-14 px-6 text-lg",
    };

    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <button className={classes} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export default Button;
