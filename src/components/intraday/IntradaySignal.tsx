import React from 'react';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, AlertTriangle, Layers } from 'lucide-react';
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

  // Confluence color logic
  const getConfluenceColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getConfluenceBgColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-danger';
  };

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

      {/* Multi-TF Confluence Section */}
      {signal.confluenceScore !== undefined && (
        <div className="mb-4 p-3 bg-secondary/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Confluencia Multi-TF</span>
            <span className={cn(
              "ml-auto text-sm font-bold",
              getConfluenceColor(signal.confluenceScore)
            )}>
              {signal.confluenceScore.toFixed(0)}%
            </span>
          </div>
          
          {/* Confluence Bar */}
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                getConfluenceBgColor(signal.confluenceScore)
              )}
              style={{ width: `${signal.confluenceScore}%` }}
            />
          </div>
          
          {/* Recommendation */}
          {signal.multiTFRecommendation && (
            <p className="text-xs text-muted-foreground">
              {signal.multiTFRecommendation}
            </p>
          )}
          
          {/* Adjacent TF Info */}
          {signal.adjacentSignals && (
            <div className="mt-2 flex flex-wrap gap-2">
              {signal.adjacentSignals.lower && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  signal.adjacentSignals.lower.direction === signal.direction
                    ? "bg-success/20 text-success"
                    : signal.adjacentSignals.lower.direction === 'NEUTRAL'
                    ? "bg-warning/20 text-warning"
                    : "bg-danger/20 text-danger"
                )}>
                  {signal.adjacentSignals.lower.timeframe}: {signal.adjacentSignals.lower.direction}
                </span>
              )}
              {signal.adjacentSignals.upper && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  signal.adjacentSignals.upper.direction === signal.direction
                    ? "bg-success/20 text-success"
                    : signal.adjacentSignals.upper.direction === 'NEUTRAL'
                    ? "bg-warning/20 text-warning"
                    : "bg-danger/20 text-danger"
                )}>
                  {signal.adjacentSignals.upper.timeframe}: {signal.adjacentSignals.upper.direction}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Multi-TF Warnings */}
      {signal.multiTFWarnings && signal.multiTFWarnings.length > 0 && (
        <div className="mb-4 space-y-1">
          {signal.multiTFWarnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-amber-500"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

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
