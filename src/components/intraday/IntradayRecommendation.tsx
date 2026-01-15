import React from 'react';
import { Brain, Activity, Repeat, Link2, CheckCircle2 } from 'lucide-react';
import { IntradayAsset } from '@/hooks/useIntradayData';
import { cn } from '@/lib/utils';

interface IntradayRecommendationProps {
  asset: IntradayAsset;
  volatility: number;
  volatilityLevel: 'Alta' | 'Media' | 'Baja';
  change24h: number;
  isLoading?: boolean;
}

export function IntradayRecommendation({
  asset,
  volatility,
  volatilityLevel,
  change24h,
  isLoading
}: IntradayRecommendationProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-secondary rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-secondary rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate recommended operations based on volatility
  const getRecommendedOps = () => {
    if (volatilityLevel === 'Alta') return { min: 1, max: 2, text: '1-2 operaciones máximo' };
    if (volatilityLevel === 'Media') return { min: 2, max: 4, text: '2-4 operaciones' };
    return { min: 3, max: 6, text: '3-6 operaciones posibles' };
  };

  // Calculate correlation hint for ETH/BNB
  const getCorrelationHint = () => {
    if (asset === 'BTC') return null;
    const correlation = asset === 'ETH' ? 0.85 : 0.72;
    return {
      asset: 'BTC',
      value: correlation,
      text: `${(correlation * 100).toFixed(0)}% correlación con BTC`
    };
  };

  const recommendedOps = getRecommendedOps();
  const correlation = getCorrelationHint();

  // Determine overall recommendation
  const getOverallRec = () => {
    if (volatilityLevel === 'Alta' && Math.abs(change24h) > 5) {
      return {
        text: 'Precaución: Alta volatilidad y movimiento fuerte',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/20'
      };
    }
    if (volatilityLevel === 'Baja' && Math.abs(change24h) < 1) {
      return {
        text: 'Mercado lateral - Esperar confirmación',
        color: 'text-info',
        bgColor: 'bg-info/10',
        borderColor: 'border-info/20'
      };
    }
    return {
      text: 'Condiciones favorables para operar',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20'
    };
  };

  const overall = getOverallRec();

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4" />
        Recomendación Intradía
      </h3>

      {/* Overall Recommendation */}
      <div className={cn(
        "p-3 rounded-lg border mb-4",
        overall.bgColor,
        overall.borderColor
      )}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className={cn("h-4 w-4", overall.color)} />
          <span className={cn("text-sm font-medium", overall.color)}>
            {overall.text}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Volatility Analysis */}
        <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className={cn(
              "h-4 w-4",
              volatilityLevel === 'Alta' ? 'text-danger' :
              volatilityLevel === 'Media' ? 'text-warning' : 'text-success'
            )} />
            <span className="text-sm text-foreground">Volatilidad 24h</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            volatilityLevel === 'Alta' ? 'text-danger' :
            volatilityLevel === 'Media' ? 'text-warning' : 'text-success'
          )}>
            {volatility.toFixed(2)}% ({volatilityLevel})
          </span>
        </div>

        {/* Recommended Operations */}
        <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">Operaciones sugeridas</span>
          </div>
          <span className="text-sm font-medium text-primary">
            {recommendedOps.text}
          </span>
        </div>

        {/* Correlation (for ETH/BNB) */}
        {correlation && (
          <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-info" />
              <span className="text-sm text-foreground">Correlación {correlation.asset}</span>
            </div>
            <span className="text-sm font-medium text-info">
              {correlation.text}
            </span>
          </div>
        )}

        {/* Breakeven hint */}
        <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">Breakeven después de TP1</span>
          </div>
          <span className="text-xs text-primary/70">
            Mover SL a entry
          </span>
        </div>
      </div>
    </div>
  );
}
