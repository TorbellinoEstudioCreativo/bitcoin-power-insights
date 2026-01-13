import { DollarSign, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { Card } from "./Card";
import { InfoTooltip } from "./InfoTooltip";
import { AnimatedNumber } from "./AnimatedNumber";
import type { USDTDominanceData } from "@/lib/usdtDominance";

interface USDTDominanceCardProps {
  data: USDTDominanceData | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function USDTDominanceCard({ 
  data,
  isLoading,
  isError
}: USDTDominanceCardProps) {
  
  // Loading state
  if (isLoading || !data) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-6 w-full bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const { dominance, metrics, regime } = data;

  // Función para obtener icono de tendencia
  const getTrendIcon = () => {
    if (metrics.change24h > 0.05) {
      return <TrendingUp className="w-4 h-4" />;
    } else if (metrics.change24h < -0.05) {
      return <TrendingDown className="w-4 h-4" />;
    }
    return <Minus className="w-4 h-4" />;
  };

  // Color basado en el cambio (subir USDT = malo para crypto)
  const getChangeColor = () => {
    if (metrics.change24h > 0.05) return 'text-danger';
    if (metrics.change24h < -0.05) return 'text-success';
    return 'text-muted-foreground';
  };

  // Color del régimen
  const getRegimeColorClasses = () => {
    switch (regime.level) {
      case 'extremo_alcista':
      case 'alcista':
        return 'bg-success/20 text-success border-success/30';
      case 'neutral':
        return 'bg-info/20 text-info border-info/30';
      case 'bajista':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'extremo_bajista':
        return 'bg-danger/20 text-danger border-danger/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-muted-foreground">USDT Dominance</span>
          <InfoTooltip 
            content="Mide qué % del mercado crypto representa USDT. Si sube = traders vendiendo crypto (bajista). Si baja = traders comprando crypto (alcista)." 
          />
        </div>
        {/* Botón Ver más (preparado para modal en Fase 2) */}
        <button 
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {/* Modal en Fase 2 */}}
        >
          Ver más
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      
      {/* Valor Principal + Cambio 24h */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-foreground">
          <AnimatedNumber value={dominance} decimals={2} suffix="%" />
        </span>
        
        {/* Indicador de cambio 24h */}
        <div className={`flex items-center gap-1 ${getChangeColor()}`}>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {metrics.change24h > 0 ? '+' : ''}
            {metrics.change24h.toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground">(24h)</span>
        </div>
      </div>
      
      {/* Badge de Régimen */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-3 ${getRegimeColorClasses()}`}>
        <span className="text-base">{regime.emoji}</span>
        <span className="text-sm font-semibold">{regime.label}</span>
      </div>
      
      {/* Descripción del régimen */}
      <p className="text-xs text-muted-foreground mb-4">
        {regime.description}
      </p>
      
      {/* Barra de Rango 7d */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Rango 7d</span>
          <span>Percentil: <span className="font-medium text-foreground">{metrics.percentile}%</span></span>
        </div>
        
        {/* Barra visual */}
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          {/* Fondo de la barra */}
          <div className="absolute inset-0 bg-gradient-to-r from-success/30 via-info/30 to-danger/30" />
          
          {/* Indicador de posición actual */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-md transition-all duration-500"
            style={{ left: `calc(${Math.max(0, Math.min(100, metrics.percentile))}% - 6px)` }}
          />
        </div>
        
        {/* Etiquetas min/actual/max */}
        <div className="flex justify-between text-xs">
          <span className="text-success font-medium">{metrics.min7d.toFixed(2)}%</span>
          <span className="text-foreground font-semibold">{dominance.toFixed(2)}%</span>
          <span className="text-danger font-medium">{metrics.max7d.toFixed(2)}%</span>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mt-3 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
          ⚠️ Error obteniendo datos
        </div>
      )}
    </Card>
  );
}
