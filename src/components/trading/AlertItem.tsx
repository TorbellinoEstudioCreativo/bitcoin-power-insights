import { Target, AlertTriangle, Bell, Trash2, TrendingUp, TrendingDown, Activity, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Alert, AlertType } from "@/hooks/useAlerts";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AlertItemProps {
  alert: Alert;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}

const alertIcons: Record<AlertType, React.ReactNode> = {
  price_target: <Target className="w-4 h-4 text-primary" />,
  stop_loss: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  margin_call: <Bell className="w-4 h-4 text-destructive" />,
  cycle_bottom: <Activity className="w-4 h-4 text-green-500" />,
  cycle_top: <Activity className="w-4 h-4 text-red-500" />,
  golden_cross: <TrendingUp className="w-4 h-4 text-green-500" />,
  death_cross: <TrendingDown className="w-4 h-4 text-red-500" />,
  corridor_breach: <Shield className="w-4 h-4 text-orange-500" />,
};

const alertTypeLabels: Record<AlertType, string> = {
  price_target: 'Precio Objetivo',
  stop_loss: 'Stop-Loss',
  margin_call: 'Margin Call',
  cycle_bottom: 'Bottom de Ciclo',
  cycle_top: 'Top de Ciclo',
  golden_cross: 'Golden Cross PL',
  death_cross: 'Death Cross PL',
  corridor_breach: 'Salida de Corredor',
};

export function AlertItem({ alert, onToggle, onDelete, onReset }: AlertItemProps) {
  const directionLabel = alert.direction === 'above' ? '↑ Cuando suba' : '↓ Cuando baje';
  
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      alert.triggered 
        ? 'bg-primary/5 border-primary/30' 
        : alert.active 
          ? 'bg-card border-border' 
          : 'bg-muted/30 border-border/50'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="mt-0.5">
            {alertIcons[alert.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm truncate ${
                !alert.active && !alert.triggered ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {alert.name}
              </span>
              {alert.triggered && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                  ✓ Disparada
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="font-mono font-medium">
                ${alert.targetPrice.toLocaleString()}
              </span>
              <span>•</span>
              <span>{directionLabel}</span>
            </div>
            {alert.triggered && alert.triggeredAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Hace {formatDistanceToNow(new Date(alert.triggeredAt), { locale: es })}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {alert.triggered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReset(alert.id)}
              className="text-xs h-7 px-2"
            >
              Reactivar
            </Button>
          ) : (
            <Switch
              checked={alert.active}
              onCheckedChange={() => onToggle(alert.id)}
              aria-label={alert.active ? 'Desactivar alerta' : 'Activar alerta'}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(alert.id)}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
