import { DollarSign, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Card } from "./Card";
import { InfoTooltip } from "./InfoTooltip";
import { AnimatedNumber } from "./AnimatedNumber";

interface USDTDominanceCardProps {
  dominance: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  isLoading?: boolean;
  isError?: boolean;
}

export function USDTDominanceCard({ 
  dominance, 
  trend, 
  change,
  isLoading,
  isError
}: USDTDominanceCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-danger" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-success" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'up':
        return 'Subiendo';
      case 'down':
        return 'Bajando';
      default:
        return 'Estable';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-danger';
      case 'down':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  const getInterpretation = () => {
    switch (trend) {
      case 'up':
        return {
          emoji: '🔴',
          text: 'Capital saliendo de crypto → Precaución'
        };
      case 'down':
        return {
          emoji: '🟢',
          text: 'Capital entrando a crypto → Alcista'
        };
      default:
        return {
          emoji: '🔵',
          text: 'Sin cambios significativos'
        };
    }
  };

  const interpretation = getInterpretation();

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
        <div className={`flex items-center gap-1 ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="text-xs font-medium">{getTrendLabel()}</span>
        </div>
      </div>
      
      {/* Valor principal */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-foreground">
          {isLoading ? (
            <span className="animate-pulse">--</span>
          ) : (
            <AnimatedNumber value={dominance} decimals={2} suffix="%" />
          )}
        </span>
        {change !== 0 && !isLoading && (
          <span className={`text-sm font-medium ${change > 0 ? 'text-danger' : 'text-success'}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      
      {/* Interpretación */}
      <div className={`text-xs ${getTrendColor()} bg-secondary/50 rounded-lg px-3 py-2`}>
        {interpretation.emoji} {interpretation.text}
      </div>

      {/* Error state */}
      {isError && (
        <div className="mt-2 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
          ⚠️ Error obteniendo datos
        </div>
      )}
    </Card>
  );
}
