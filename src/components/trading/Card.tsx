import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}

export function Card({ children, className, highlighted = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl p-4 shadow-lg transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10",
        "animate-fade-in",
        highlighted && "border-2 border-primary shadow-primary/20",
        !highlighted && "border border-border",
        className
      )}
    >
      {children}
    </div>
  );
}
