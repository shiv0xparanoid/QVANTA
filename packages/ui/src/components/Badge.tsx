import * as React from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "primary" | "secondary" | "destructive";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-bg-800 text-text-200 border-bg-700",
  success:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning:
    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error:
    "bg-red-500/15 text-red-400 border-red-500/30",
  primary:
    "bg-primary-500/15 text-primary-300 border-primary-500/30",
  secondary:
    "bg-bg-800 text-text-300 border-bg-700",
  destructive:
    "bg-red-600/15 text-red-300 border-red-600/30"
};

const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "default",
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
};

Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps, BadgeVariant };
