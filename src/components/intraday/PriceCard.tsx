import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { IntradayAsset } from '@/hooks/useIntradayData';
import { cn } from '@/lib/utils';

interface PriceCardProps {
  asset: IntradayAsset;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volatilityLevel: 'Alta' | 'Media' | 'Baja';
  isLoading?: boolean;
}

export function PriceCard({
  asset,
  currentPrice,
  change24h,
  high24h,
  low24h,
  volatilityLevel,
  isLoading
}: PriceCardProps) {
  const isPositive = change24h >= 0;
  
  const formatPrice = (price: number) => {
    if (asset === 'BTC') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (asset === 'ETH') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  const volatilityColors = {
    Alta: 'bg-danger/20 text-danger',
    Media: 'bg-warning/20 text-warning',
    Baja: 'bg-success/20 text-success'
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-8 bg-secondary rounded w-32 mb-2" />
        <div className="h-6 bg-secondary rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{asset}/USDT</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            volatilityColors[volatilityLevel]
          )}>
            <Activity className="inline h-3 w-3 mr-1" />
            Vol. {volatilityLevel}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Intradía</span>
      </div>
      
      {/* Price */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-3xl font-bold text-foreground">
          {formatPrice(currentPrice)}
        </span>
        <span className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isPositive ? "text-success" : "text-danger"
        )}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {isPositive ? '+' : ''}{change24h.toFixed(2)}%
        </span>
      </div>
      
      {/* High/Low */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div>
          <span className="text-success">▲</span> 24h Alto: {formatPrice(high24h)}
        </div>
        <div>
          <span className="text-danger">▼</span> 24h Bajo: {formatPrice(low24h)}
        </div>
      </div>
    </div>
  );
}
