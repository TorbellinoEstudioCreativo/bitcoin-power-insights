import { Settings, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Bitcoin Power Law Analyzer
          </h1>
          <p className="text-xs text-muted-foreground">
            Modelo de Giovanni Santostasi
          </p>
        </div>
      </div>
      
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
        <Settings className="w-5 h-5" />
      </Button>
    </header>
  );
}
