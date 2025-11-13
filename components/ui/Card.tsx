import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = ({ className, children, ...props }: CardProps) => {
  const classes = [
    "flex flex-col gap-4 rounded-lg p-6 border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-card-hover-light dark:hover:bg-card-hover-dark transition-colors",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
