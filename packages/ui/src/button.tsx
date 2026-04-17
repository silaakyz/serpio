import * as React from "react";

type ButtonVariant = "default" | "primary" | "ghost" | "destructive";
type ButtonSize = "sm" | "default" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-elevated border border-border text-text hover:bg-border transition-colors",
  primary:
    "bg-emerald text-void font-semibold hover:opacity-90 transition-opacity",
  ghost:
    "bg-transparent text-muted hover:text-text hover:bg-elevated transition-colors",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 transition-colors"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  default: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
