import React from 'react';
import { Target, Shield, TrendingUp, Percent } from 'lucide-react';
import { IntradaySignal } from '@/hooks/useIntradaySignal';
import { IntradayAsset } from '@/hooks/useIntradayData';
import { cn } from '@/lib/utils';

interface TradingLevelsProps {
  signal: IntradaySignal | null;
  asset: IntradayAsset;
  isLoading?: boolean;
}

export function TradingLevels({ signal, asset, isLoading }: TradingLevelsProps) {
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
        {/* Entry Price */}
        <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground">Entry</span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {formatPrice(signal.entryPrice)}
          </span>
        </div>

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
