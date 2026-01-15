import React from 'react';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from 'lucide-react';
import { IntradaySignal as IntradaySignalType } from '@/hooks/useIntradaySignal';
import { cn } from '@/lib/utils';

interface IntradaySignalProps {
  signal: IntradaySignalType | null;
  isLoading?: boolean;
}

export function IntradaySignal({ signal, isLoading }: IntradaySignalProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-8 bg-secondary rounded w-24 mb-4" />
        <div className="h-4 bg-secondary rounded w-full mb-2" />
        <div className="h-4 bg-secondary rounded w-3/4" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-muted-foreground text-sm">Cargando señal...</p>
      </div>
    );
  }

  const directionConfig = {
    LONG: {
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/20',
      borderColor: 'border-success/30',
      label: 'LONG'
    },
    SHORT: {
      icon: TrendingDown,
      color: 'text-danger',
      bgColor: 'bg-danger/20',
      borderColor: 'border-danger/30',
      label: 'SHORT'
    },
    NEUTRAL: {
      icon: Minus,
      color: 'text-warning',
      bgColor: 'bg-warning/20',
      borderColor: 'border-warning/30',
      label: 'NEUTRAL'
    }
  };

  const config = directionConfig[signal.direction];
  const Icon = config.icon;

  return (
    <div className={cn(
      "bg-card border rounded-xl p-4",
      config.borderColor
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          config.bgColor
        )}>
          <Icon className={cn("h-5 w-5", config.color)} />
          <span className={cn("text-lg font-bold", config.color)}>
            {config.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Confianza</p>
          <p className={cn("text-xl font-bold", config.color)}>
            {signal.confidence.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              signal.direction === 'LONG' ? 'bg-success' :
              signal.direction === 'SHORT' ? 'bg-danger' : 'bg-warning'
            )}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* Factors */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Factores de Análisis</h4>
        {signal.factors.slice(0, 6).map((factor, index) => (
          <div
            key={index}
            className="flex items-start gap-2 text-xs"
          >
            {factor.positive ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" />
            )}
            <span className={cn(
              factor.positive ? "text-foreground" : "text-muted-foreground"
            )}>
              {factor.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
