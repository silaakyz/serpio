import * as React from "react";

export const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`animate-pulse rounded-md bg-elevated ${className}`}
    {...props}
  />
));

Skeleton.displayName = "Skeleton";
