import React from 'react';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Shield, Activity, Info, Zap, History, Layers } from 'lucide-react';
import { DerivativesData, formatOpenInterest, formatFundingRate } from '@/lib/derivatives';
import { LiquidationData } from '@/hooks/useLiquidationPools';
import { LiquidationCluster } from '@/lib/coinglass';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Get method badge info
  const getMethodBadge = () => {
    if (!liquidationData) return null;
    
    switch (liquidationData.method) {
      case 'coinglass_real':
        return {
          text: '🎯 Datos Reales',
          color: 'bg-success/20 text-success border-success/30',
          icon: Zap
        };
      case 'atr_volatility':
        return {
          text: 'ATR + Volatilidad',
          color: 'bg-primary/20 text-primary border-primary/30',
          icon: Activity
        };
      case 'fallback_fixed':
        return {
          text: 'Estimación Base',
          color: 'bg-muted text-muted-foreground border-border',
          icon: Info
        };
      default:
        return null;
    }
  };

  // Get heat level alert
  const getHeatLevelAlert = () => {
    if (!liquidationData) return null;
    
    switch (liquidationData.heatLevel) {
      case 'hot':
        return {
          text: 'Pool crítico cercano - Reducir apalancamiento',
          icon: AlertTriangle,
          color: 'bg-danger/10 border-danger/30 text-danger'
        };
      case 'warm':
        return {
          text: 'Zona de alerta - Monitorear posiciones',
          icon: Activity,
          color: 'bg-warning/10 border-warning/30 text-warning'
        };
      default:
        return null;
    }
  };

  // Get distance badge
  const getDistanceBadge = (distancePercent: number) => {
    if (distancePercent < 1.5) {
      return { text: 'Muy cerca', color: 'text-danger' };
    } else if (distancePercent < 2.5) {
      return { text: 'Cerca', color: 'text-warning' };
    }
    return { text: 'Distante', color: 'text-success' };
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Hace <1h';
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  // Get significance badge
  const getSignificanceBadge = (significance?: string) => {
    switch (significance) {
      case 'critical':
        return { text: '🔥 Crítico', color: 'bg-danger/30 text-danger' };
      case 'high':
        return { text: '⚠️ Alto', color: 'bg-warning/30 text-warning' };
      case 'medium':
        return { text: 'Moderado', color: 'bg-primary/30 text-primary' };
      default:
        return { text: 'Bajo', color: 'bg-muted text-muted-foreground' };
    }
  };

  // Render a single zone item
  const renderZoneItem = (zone: LiquidationCluster, type: 'long' | 'short', currentPrice: number) => {
    const distance = type === 'long' 
      ? ((currentPrice - zone.priceRange.avg) / currentPrice) * 100
      : ((zone.priceRange.avg - currentPrice) / currentPrice) * 100;
    
    const distanceBadge = getDistanceBadge(Math.abs(distance));
    const significanceBadge = getSignificanceBadge(zone.significance);
    
    return (
      <div 
        key={`${type}-${zone.priceRange.avg}`}
        className={cn(
          "flex items-center justify-between p-2 rounded-lg border",
          type === 'long' 
            ? 'bg-danger/5 border-danger/20' 
            : 'bg-success/5 border-success/20'
        )}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              ${zone.priceRange.avg.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className={cn("text-[10px] font-medium", distanceBadge.color)}>
              {type === 'long' ? '-' : '+'}{Math.abs(distance).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={cn("text-[9px] px-1 py-0.5 rounded", significanceBadge.color)}>
              {significanceBadge.text}
            </span>
            <span className={cn(
              "text-[9px]",
              type === 'long' ? 'text-danger/70' : 'text-success/70'
            )}>
              ${zone.totalVolume.toFixed(0)}M
            </span>
          </div>
        </div>
        {zone.lastOccurrence && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <History className="h-2.5 w-2.5" />
            {formatTimeAgo(zone.lastOccurrence)}
          </div>
        )}
      </div>
    );
  };

  const methodBadge = getMethodBadge();
  const heatAlert = getHeatLevelAlert();
  
  // Check if we have multiple zones from Coinglass
  const hasMultipleZones = liquidationData?.method === 'coinglass_real' && 
    (liquidationData.zonesAbove?.length || liquidationData.zonesBelow?.length);

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

      {/* Long/Short Ratio (if Coinglass data available) */}
      {liquidationData?.longShortRatio && (
        <div className="bg-secondary/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Long/Short Ratio</span>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded",
              liquidationData.longShortRatio.trend === 'bullish' ? 'bg-success/20 text-success' :
              liquidationData.longShortRatio.trend === 'bearish' ? 'bg-danger/20 text-danger' :
              'bg-muted text-muted-foreground'
            )}>
              {liquidationData.longShortRatio.trend === 'bullish' ? '📈 Alcista' :
               liquidationData.longShortRatio.trend === 'bearish' ? '📉 Bajista' : 'Neutral'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-danger/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${liquidationData.longShortRatio.longPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {liquidationData.longShortRatio.longPercent.toFixed(0)}% / {liquidationData.longShortRatio.shortPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Liquidation Pools */}
      {liquidationData && (
        <>
          {/* Header with method badge */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Zonas de Liquidación
              {hasMultipleZones && (
                <span className="flex items-center gap-1 text-[10px] text-primary">
                  <Layers className="h-3 w-3" />
                  Multi-zona
                </span>
              )}
            </h4>
            
            {methodBadge && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-help",
                      methodBadge.color
                    )}>
                      <methodBadge.icon className="h-2.5 w-2.5" />
                      {methodBadge.text}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{liquidationData.calculationReason}</p>
                    {liquidationData.atrValue && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ATR: ${liquidationData.atrValue.toFixed(2)}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Heat Level Alert */}
          {heatAlert && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 text-xs",
              heatAlert.color
            )}>
              <heatAlert.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{heatAlert.text}</span>
            </div>
          )}

          {/* Multiple Zones Display (Coinglass Real Data) */}
          {hasMultipleZones ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* LONG Pools (below price) */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <TrendingDown className="h-3 w-3 text-danger" />
                  <span className="text-[10px] text-danger font-medium">LONG POOLS</span>
                  <span className="text-[9px] text-muted-foreground">
                    ({liquidationData.zonesBelow?.length || 0})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {liquidationData.zonesBelow?.slice(0, 3).map(zone => 
                    renderZoneItem(zone, 'long', liquidationData.longLiquidationPool.price / (1 - liquidationData.longLiquidationPool.distancePercent / 100))
                  )}
                  {(!liquidationData.zonesBelow || liquidationData.zonesBelow.length === 0) && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Sin zonas cercanas
                    </p>
                  )}
                </div>
              </div>
              
              {/* SHORT Pools (above price) */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-[10px] text-success font-medium">SHORT POOLS</span>
                  <span className="text-[9px] text-muted-foreground">
                    ({liquidationData.zonesAbove?.length || 0})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {liquidationData.zonesAbove?.slice(0, 3).map(zone => 
                    renderZoneItem(zone, 'short', liquidationData.shortLiquidationPool.price / (1 + liquidationData.shortLiquidationPool.distancePercent / 100))
                  )}
                  {(!liquidationData.zonesAbove || liquidationData.zonesAbove.length === 0) && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Sin zonas cercanas
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Single Zone Display (ATR Fallback) */
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* Long Pool (below price) */}
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-2.5">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-danger" />
                  <span className="text-[10px] text-danger font-medium">LONG POOL</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  ${liquidationData.longLiquidationPool.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    -{liquidationData.longLiquidationPool.distancePercent.toFixed(1)}%
                  </p>
                  <span className={cn(
                    "text-[9px] font-medium",
                    getDistanceBadge(liquidationData.longLiquidationPool.distancePercent).color
                  )}>
                    {getDistanceBadge(liquidationData.longLiquidationPool.distancePercent).text}
                  </span>
                </div>
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
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    +{liquidationData.shortLiquidationPool.distancePercent.toFixed(1)}%
                  </p>
                  <span className={cn(
                    "text-[9px] font-medium",
                    getDistanceBadge(liquidationData.shortLiquidationPool.distancePercent).color
                  )}>
                    {getDistanceBadge(liquidationData.shortLiquidationPool.distancePercent).text}
                  </span>
                </div>
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
                <p className="text-[10px] text-muted-foreground mt-1">
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
          )}

          {/* Suggested SL for multi-zone view */}
          {hasMultipleZones && (
            <div className="bg-info/10 border border-info/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-info" />
                  <span className="text-xs text-info font-medium">STOP LOSS SUGERIDO</span>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded",
                  liquidationData.riskLevel === 'high' ? 'bg-danger/20 text-danger' :
                  liquidationData.riskLevel === 'medium' ? 'bg-warning/20 text-warning' : 
                  'bg-success/20 text-success'
                )}>
                  Riesgo {liquidationData.riskLevel === 'high' ? 'Alto' : 
                          liquidationData.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-lg font-bold text-foreground">
                  ${liquidationData.suggestedStopLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  -{liquidationData.suggestedStopLossPercent.toFixed(1)}% del precio actual
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
