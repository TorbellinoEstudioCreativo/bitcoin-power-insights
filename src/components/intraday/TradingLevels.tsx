import React from 'react';
import { Target, Shield, TrendingUp, Percent, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { IntradaySignal } from '@/hooks/useIntradaySignal';
import { IntradayAsset, IntradayData } from '@/hooks/useIntradayData';
import { useOptimalEntry } from '@/hooks/useOptimalEntry';
import { cn } from '@/lib/utils';

interface TradingLevelsProps {
  signal: IntradaySignal | null;
  asset: IntradayAsset;
  intradayData?: IntradayData | null;
  isLoading?: boolean;
}

export function TradingLevels({ signal, asset, intradayData, isLoading }: TradingLevelsProps) {
  // Calculate optimal entry zone
  const optimalEntry = useOptimalEntry(
    intradayData,
    signal?.direction,
    signal?.riskRewardRatio ?? 1.5
  );

  if (isLoading || !signal) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-secondary rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-secondary rounded" />
          ))}
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (asset === 'BTC') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  const calculatePercent = (target: number, entry: number) => {
    const percent = ((target - entry) / entry) * 100;
    return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
  };

  const isLong = signal.direction === 'LONG';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          Niveles de Operación
        </h3>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded",
          isLong ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
        )}>
          R:R {signal.riskRewardRatio.toFixed(1)}:1
        </span>
      </div>

      <div className="space-y-2">
        {/* Optimal Entry Zone - NEW SECTION */}
        {optimalEntry && optimalEntry.isOptimal && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">
                  Zona de Entrada Óptima
                </span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-success/20 text-success">
                Mejor R:R: {optimalEntry.optimalRR}
              </span>
            </div>

            {/* Optimal Price Range */}
            <div className="mb-3 p-2 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Rango ideal:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(optimalEntry.zone.low)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(optimalEntry.zone.high)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {optimalEntry.distancePercent.toFixed(2)}% {isLong ? 'debajo' : 'arriba'} del precio actual
              </p>
            </div>

            {/* Suggested Entry Price */}
            <div className="mb-3 flex items-center justify-between p-2 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="text-xs text-muted-foreground">Entry sugerido:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">
                  {formatPrice(optimalEntry.suggestedPrice)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                  Orden limitada
                </span>
              </div>
            </div>

            {/* Entry Strategy Steps */}
            <div className="mb-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-muted-foreground min-w-[16px]">1.</span>
                <span className="text-xs text-muted-foreground">
                  Colocar orden limitada en {formatPrice(optimalEntry.suggestedPrice)}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-muted-foreground min-w-[16px]">2.</span>
                <span className="text-xs text-muted-foreground">
                  Cambiar a timeframe {optimalEntry.watchTimeframe} para monitorear
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-muted-foreground min-w-[16px]">3.</span>
                <span className="text-xs text-muted-foreground">
                  Esperar: {optimalEntry.triggerCondition}
                </span>
              </div>
            </div>

            {/* Advantage vs Immediate Entry */}
            <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-muted-foreground">Ventaja vs entrada inmediata:</span>
              <span className="text-xs font-bold text-success">
                +{optimalEntry.advantagePercent.toFixed(0)}% mejor R:R
              </span>
            </div>
          </div>
        )}

        {/* Entry Price */}
        <div className={cn(
          "flex items-center justify-between p-2.5 rounded-lg",
          optimalEntry?.isOptimal 
            ? "bg-muted/50 border border-dashed border-muted-foreground/30"
            : "bg-secondary/50"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground">
              Entry {optimalEntry?.isOptimal ? '(mercado)' : ''}
            </span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {formatPrice(signal.entryPrice)}
          </span>
        </div>

        {/* Warning if optimal entry available */}
        {optimalEntry?.isOptimal && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-500">
              Mejor esperar retroceso para optimizar R:R
            </span>
          </div>
        )}

        {/* Stop Loss */}
        <div className="flex items-center justify-between p-2.5 bg-danger/10 border border-danger/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-danger" />
            <span className="text-sm text-danger">Stop Loss</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-danger">
              {formatPrice(signal.stopLoss)}
            </span>
            <span className="text-xs text-danger/70 ml-2">
              {calculatePercent(signal.stopLoss, signal.entryPrice)}
            </span>
          </div>
        </div>

        {/* Take Profits */}
        <div className="flex items-center justify-between p-2.5 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm text-success">TP1 (40%)</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-success">
              {formatPrice(signal.takeProfit1)}
            </span>
            <span className="text-xs text-success/70 ml-2">
              {calculatePercent(signal.takeProfit1, signal.entryPrice)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm text-success">TP2 (30%)</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-success">
              {formatPrice(signal.takeProfit2)}
            </span>
            <span className="text-xs text-success/70 ml-2">
              {calculatePercent(signal.takeProfit2, signal.entryPrice)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm text-success">TP3 (20%)</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-success">
              {formatPrice(signal.takeProfit3)}
            </span>
            <span className="text-xs text-success/70 ml-2">
              {calculatePercent(signal.takeProfit3, signal.entryPrice)}
            </span>
          </div>
        </div>

        {/* Trailing */}
        <div className="flex items-center justify-between p-2.5 bg-info/10 border border-info/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-info" />
            <span className="text-sm text-info">Trailing (10%)</span>
          </div>
          <span className="text-xs text-info/70">
            Activar después de TP2
          </span>
        </div>
      </div>
    </div>
  );
}
