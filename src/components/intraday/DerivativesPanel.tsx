import React from 'react';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Target, Shield } from 'lucide-react';
import { DerivativesData, formatOpenInterest, formatFundingRate } from '@/lib/derivatives';
import { LiquidationData } from '@/hooks/useLiquidationPools';
import { cn } from '@/lib/utils';

interface DerivativesPanelProps {
  derivativesData: DerivativesData | null | undefined;
  liquidationData: LiquidationData | null;
  isLoading?: boolean;
}

export function DerivativesPanel({
  derivativesData,
  liquidationData,
  isLoading
}: DerivativesPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-secondary rounded w-32 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-secondary rounded" />
          <div className="h-24 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  // Calculate countdown to next funding
  const getNextFundingCountdown = () => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const fundingHours = [0, 8, 16];
    
    let nextFunding = fundingHours.find(h => h > currentHour);
    if (nextFunding === undefined) nextFunding = 24;
    
    const hoursUntil = nextFunding - currentHour - 1;
    const minutesUntil = 60 - now.getUTCMinutes();
    
    return `${hoursUntil}h ${minutesUntil}m`;
  };

  const fundingRateColor = (rate: number) => {
    if (rate > 0.05) return 'text-danger';
    if (rate < -0.01) return 'text-success';
    return 'text-warning';
  };

  const oiChangeColor = (change: number) => {
    if (change > 3) return 'text-success';
    if (change < -3) return 'text-danger';
    return 'text-muted-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Derivados en Tiempo Real</h3>
      
      {/* OI & Funding Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Open Interest */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Open Interest</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {derivativesData ? formatOpenInterest(derivativesData.openInterest.openInterestUsd) : '--'}
          </p>
          {derivativesData && (
            <p className={cn(
              "text-xs mt-1",
              oiChangeColor(derivativesData.openInterest.change24h)
            )}>
              {derivativesData.openInterest.change24h >= 0 ? '+' : ''}
              {derivativesData.openInterest.change24h.toFixed(1)}% 24h
            </p>
          )}
        </div>

        {/* Funding Rate */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Funding Rate</span>
          </div>
          <p className={cn(
            "text-lg font-bold",
            derivativesData && fundingRateColor(derivativesData.fundingRate.fundingRatePercent)
          )}>
            {derivativesData ? formatFundingRate(derivativesData.fundingRate.fundingRatePercent) : '--'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Próximo: {getNextFundingCountdown()}
          </p>
        </div>
      </div>

      {/* Liquidation Pools */}
      {liquidationData && (
        <>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Zonas de Liquidación Estimadas
          </h4>
          
          <div className="grid grid-cols-3 gap-2">
            {/* Long Pool (below price) */}
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="h-3 w-3 text-danger" />
                <span className="text-[10px] text-danger font-medium">LONG POOL</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                ${liquidationData.longLiquidationPool.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                -{liquidationData.longLiquidationPool.distancePercent.toFixed(1)}%
              </p>
              <p className="text-[10px] text-danger/70">
                {liquidationData.longLiquidationPool.estimatedLiquidity}
              </p>
            </div>

            {/* Short Pool (above price) */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-[10px] text-success font-medium">SHORT POOL</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                ${liquidationData.shortLiquidationPool.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                +{liquidationData.shortLiquidationPool.distancePercent.toFixed(1)}%
              </p>
              <p className="text-[10px] text-success/70">
                {liquidationData.shortLiquidationPool.estimatedLiquidity}
              </p>
            </div>

            {/* Suggested SL */}
            <div className="bg-info/10 border border-info/20 rounded-lg p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="h-3 w-3 text-info" />
                <span className="text-[10px] text-info font-medium">SL SUGERIDO</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                ${liquidationData.suggestedStopLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                -{liquidationData.suggestedStopLossPercent.toFixed(1)}%
              </p>
              <p className={cn(
                "text-[10px]",
                liquidationData.riskLevel === 'high' ? 'text-danger' :
                liquidationData.riskLevel === 'medium' ? 'text-warning' : 'text-success'
              )}>
                Riesgo {liquidationData.riskLevel === 'high' ? 'Alto' : 
                        liquidationData.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
