import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-sm",
  secondary:
    "bg-bg-800 text-text-100 border border-bg-700 hover:bg-bg-700 focus-visible:ring-primary-500 shadow-sm",
  ghost:
    "bg-transparent text-text-100 hover:bg-bg-800 focus-visible:ring-primary-500",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-base rounded-lg gap-2"
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      type = "button",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950 disabled:pointer-events-none disabled:opacity-50";
    const isDisabled = Boolean(disabled) || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {loading ? (
          <span className={children ? "" : "sr-only"}>{children ?? "Loading"}</span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
