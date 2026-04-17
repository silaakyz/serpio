import * as React from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-elevated text-text border border-border",
  success: "bg-emerald/10 text-emerald border border-emerald/30",
  warning: "bg-gold/10 text-gold border border-gold/30",
  error: "bg-red-500/10 text-red-400 border border-red-500/30",
  info: "bg-electric/10 text-electric border border-electric/30"
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className = "", ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
);

Badge.displayName = "Badge";
