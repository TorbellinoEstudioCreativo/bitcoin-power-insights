import { useEffect } from "react";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { logger } from "@/lib/logger";
import { Card } from "./Card";
import { InfoTooltip } from "./InfoTooltip";
import { OpenInterestData, formatOpenInterest } from "@/lib/derivatives";

interface OpenInterestCardCompactProps {
  data?: OpenInterestData;
  isLoading?: boolean;
}

export function OpenInterestCardCompact({ data, isLoading }: OpenInterestCardCompactProps) {
  // Debug: Log cuando cambian los datos
  useEffect(() => {
    if (data) {
      logger.log('[OpenInterestCard] Data received:', {
        value: formatOpenInterest(data.openInterestUsd),
        change24h: `${data.change24h.toFixed(2)}%`,
        signal: data.signal
      });
    }
  }, [data]);
  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="h-7 w-20 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span className="text-sm">Open Interest no disponible</span>
        </div>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (data.trend === 'rising') return <TrendingUp className="w-4 h-4 text-success" />;
    if (data.trend === 'falling') return <TrendingDown className="w-4 h-4 text-danger" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getSignalColor = () => {
    switch (data.signal) {
      case 'bullish':
      case 'buildup':
        return 'text-success';
      case 'bearish':
        return 'text-danger';
      default:
        return 'text-muted-foreground';
    }
  };

  const getSignalBg = () => {
    switch (data.signal) {
      case 'bullish':
      case 'buildup':
        return 'bg-success/10 border-success/20';
      case 'bearish':
        return 'bg-danger/10 border-danger/20';
      default:
        return 'bg-secondary/50';
    }
  };

  return (
    <Card className={`border ${getSignalBg()}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-info" />
        <span className="text-sm font-medium text-muted-foreground">Open Interest</span>
        <InfoTooltip content="Cantidad total de contratos abiertos en Binance Futures. Un aumento indica nuevo capital entrando al mercado." />
      </div>

      {/* Valor principal */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl font-bold text-foreground">
          {formatOpenInterest(data.openInterestUsd)}
        </span>
        
        {/* Cambio 24h */}
        <div className={`flex items-center gap-1 text-sm font-medium ${
          data.change24h >= 0 ? 'text-success' : 'text-danger'
        }`}>
          {getTrendIcon()}
          <span>{data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(1)}%</span>
        </div>
      </div>

      {/* Interpretación */}
      <div className={`text-xs ${getSignalColor()}`}>
        {data.signal === 'buildup' && '🔥 '}
        {data.interpretation}
      </div>
    </Card>
  );
}
