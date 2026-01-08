import { useState } from "react";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertItem } from "./AlertItem";
import { AlertModal } from "./AlertModal";
import type { Alert, AlertType, AlertDirection } from "@/hooks/useAlerts";

interface AlertsManagerProps {
  alerts: Alert[];
  activeAlertsCount: number;
  canAddMore: boolean;
  maxAlerts: number;
  currentPrice?: number;
  onAddAlert: (alert: {
    type: AlertType;
    name: string;
    targetPrice: number;
    direction: AlertDirection;
    active: boolean;
  }) => boolean;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
}

export function AlertsManager({
  alerts,
  activeAlertsCount,
  canAddMore,
  maxAlerts,
  currentPrice,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  onResetAlert,
}: AlertsManagerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-5 h-5" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              🔔 Alertas de Precio
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {alerts.length}/{maxAlerts} alertas configuradas
            </p>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tienes alertas configuradas</p>
                <p className="text-xs mt-1">
                  Crea una alerta para recibir notificaciones cuando el precio llegue a tu objetivo.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {alerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onToggle={onToggleAlert}
                    onDelete={onDeleteAlert}
                    onReset={onResetAlert}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!canAddMore}
              onClick={() => {
                setIsPopoverOpen(false);
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Alerta
              {!canAddMore && <span className="ml-1 text-xs opacity-70">(máx. {maxAlerts})</span>}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <AlertModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={onAddAlert}
        currentPrice={currentPrice}
      />
    </>
  );
}
