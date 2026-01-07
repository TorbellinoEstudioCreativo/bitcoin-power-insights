import { LayoutDashboard, TrendingUp, Settings, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: TrendingUp, label: "Análisis" },
  { icon: Settings, label: "Settings" },
  { icon: Info, label: "Info" },
];

export function LeftSidebar() {
  return (
    <aside className="w-20 bg-card border-r border-border flex flex-col items-center py-6 gap-2">
      {navItems.map((item) => (
        <button
          key={item.label}
          className={cn(
            "w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200",
            item.active
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{item.label.slice(0, 4)}</span>
        </button>
      ))}
    </aside>
  );
}
