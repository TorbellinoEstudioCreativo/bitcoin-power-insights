import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles = {
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning", 
  danger: "bg-danger/20 text-danger",
  info: "bg-info/20 text-info",
};

export function Badge({ children, variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
