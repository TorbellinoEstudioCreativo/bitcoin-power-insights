import { useState } from "react";
import { Settings, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PowerLawInfoModal } from "./PowerLawInfoModal";
import { AlertsManager } from "./AlertsManager";
import type { Alert, AlertType, AlertDirection } from "@/hooks/useAlerts";

interface HeaderProps {
  alerts?: Alert[];
  activeAlertsCount?: number;
  canAddMore?: boolean;
  maxAlerts?: number;
  currentPrice?: number;
  onAddAlert?: (alert: {
    type: AlertType;
    name: string;
    targetPrice: number;
    direction: AlertDirection;
    active: boolean;
  }) => boolean;
  onToggleAlert?: (id: string) => void;
  onDeleteAlert?: (id: string) => void;
  onResetAlert?: (id: string) => void;
}

export function Header({
  alerts = [],
  activeAlertsCount = 0,
  canAddMore = true,
  maxAlerts = 5,
  currentPrice,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  onResetAlert,
}: HeaderProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Bitcoin Power Law Analyzer
            </h1>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">
                Modelo de Giovanni Santostasi
              </p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-0.5 hover:bg-muted rounded-full transition-colors"
                aria-label="Información sobre el modelo"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {onAddAlert && onToggleAlert && onDeleteAlert && onResetAlert && (
            <AlertsManager
              alerts={alerts}
              activeAlertsCount={activeAlertsCount}
              canAddMore={canAddMore}
              maxAlerts={maxAlerts}
              currentPrice={currentPrice}
              onAddAlert={onAddAlert}
              onToggleAlert={onToggleAlert}
              onDeleteAlert={onDeleteAlert}
              onResetAlert={onResetAlert}
            />
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <PowerLawInfoModal 
        open={showInfoModal} 
        onOpenChange={setShowInfoModal} 
      />
    </>
  );
}
