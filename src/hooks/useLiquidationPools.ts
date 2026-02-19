import { useMemo } from 'react';
import { IntradayAsset, IntradayTimeframe, IntradayCandle } from './useIntradayData';
import { DerivativesData } from '@/lib/derivatives';
import {
  calculateIntelligentZones,
  IntelligentLiquidationData
} from '@/lib/liquidationCalculations';
import { useRealLiquidations } from './useRealLiquidations';
import { LiquidationCluster } from '@/lib/coinglass';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES (Extended for backward compatibility)
// ============================================================================

export interface LiquidationPool {
  price: number;
  type: 'long' | 'short';
  estimatedLiquidity: string;
  distancePercent: number;
  // Coinglass metadata (optional)
  volume?: number;
  significance?: 'critical' | 'high' | 'medium' | 'low';
  leverageProfile?: 'low' | 'medium' | 'high';
  lastOccurrence?: number;
}

export interface LiquidationData {
  longLiquidationPool: LiquidationPool;
  shortLiquidationPool: LiquidationPool;
  suggestedStopLoss: number;
  suggestedStopLossPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  // Calculation method fields
  method: 'atr_volatility' | 'coinglass_real' | 'fallback_fixed';
  heatLevel: 'hot' | 'warm' | 'cold';
  calculationReason: string;
  atrValue?: number;
  volatilityMultiplier?: number;
  // Coinglass-specific fields
  longShortRatio?: {
    longPercent: number;
    shortPercent: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  // Multiple zones from Coinglass
  zonesAbove?: LiquidationCluster[];  // SHORT pools (above price)
  zonesBelow?: LiquidationCluster[];  // LONG pools (below price)
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Calculates intelligent liquidation zones.
 * Prioritizes real Coinglass data when available, falls back to ATR calculation.
 */
export function useLiquidationPools(
  currentPrice: number,
  asset: IntradayAsset = 'BTC',
  timeframe: IntradayTimeframe = '15m',
  candles: IntradayCandle[] = [],
  derivativesData: DerivativesData | null = null,
  volatility: number = 1.0
): LiquidationData | null {
  // Try to fetch real data from Coinglass
  const {
    data: coinglassData,
    isLoading: isLoadingCoinglass,
    error: coinglassError
  } = useRealLiquidations(asset, currentPrice, 'NEUTRAL');

  return useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null;

    // PRIORITY 1: Use real Coinglass data if available
    if (coinglassData && !coinglassError && coinglassData.clusters.length > 0) {
      logger.log(`[useLiquidationPools] Using REAL Coinglass data for ${asset}`);

      const { zonesAbove, zonesBelow, criticalZone, longShortRatio } = coinglassData;

      // Find most significant zone below (long liquidations)
      const criticalBelow = zonesBelow.find(z =>
        z.significance === 'critical' || z.significance === 'high'
      ) || zonesBelow[0];

      // Find most significant zone above (short liquidations)
      const criticalAbove = zonesAbove.find(z =>
        z.significance === 'critical' || z.significance === 'high'
      ) || zonesAbove[0];

      // Calculate distances
      const longPoolPrice = criticalBelow?.priceRange.avg || currentPrice * 0.975;
      const shortPoolPrice = criticalAbove?.priceRange.avg || currentPrice * 1.025;
      const longDistance = ((currentPrice - longPoolPrice) / currentPrice) * 100;
      const shortDistance = ((shortPoolPrice - currentPrice) / currentPrice) * 100;

      // Calculate SL: below the long pool with buffer
      const slBuffer = 0.5;
      const slPrice = criticalBelow
        ? criticalBelow.priceRange.min * (1 - slBuffer / 100)
        : currentPrice * 0.97;
      const slDistance = ((currentPrice - slPrice) / currentPrice) * 100;

      // Determine risk based on proximity
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (longDistance < 1.5 || shortDistance < 1.5) riskLevel = 'high';
      else if (longDistance < 2.5 || shortDistance < 2.5) riskLevel = 'medium';

      // Determine heat level
      let heatLevel: 'hot' | 'warm' | 'cold' = 'cold';
      if (criticalZone &&
          (criticalZone.significance === 'critical' || criticalZone.significance === 'high')) {
        const criticalDistance = Math.abs(
          ((criticalZone.priceRange.avg - currentPrice) / currentPrice) * 100
        );
        if (criticalDistance < 1.5) heatLevel = 'hot';
        else if (criticalDistance < 3) heatLevel = 'warm';
      }

      const result: LiquidationData = {
        longLiquidationPool: {
          price: longPoolPrice,
          type: 'long',
          estimatedLiquidity: criticalBelow
            ? `$${criticalBelow.totalVolume.toFixed(0)}M`
            : '~$50M',
          distancePercent: longDistance,
          volume: criticalBelow?.totalVolume,
          significance: criticalBelow?.significance,
          leverageProfile: criticalBelow?.leverageProfile,
          lastOccurrence: criticalBelow?.lastOccurrence
        },
        shortLiquidationPool: {
          price: shortPoolPrice,
          type: 'short',
          estimatedLiquidity: criticalAbove
            ? `$${criticalAbove.totalVolume.toFixed(0)}M`
            : '~$40M',
          distancePercent: shortDistance,
          volume: criticalAbove?.totalVolume,
          significance: criticalAbove?.significance,
          leverageProfile: criticalAbove?.leverageProfile,
          lastOccurrence: criticalAbove?.lastOccurrence
        },
        suggestedStopLoss: slPrice,
        suggestedStopLossPercent: slDistance,
        riskLevel,
        method: 'coinglass_real',
        heatLevel,
        calculationReason: `Datos reales de Coinglass (${coinglassData.liquidations.length} liquidaciones analizadas)`,
        longShortRatio: longShortRatio ? {
          longPercent: longShortRatio.longPercent,
          shortPercent: longShortRatio.shortPercent,
          trend: longShortRatio.trend
        } : undefined,
        // Expose full zone arrays for UI
        zonesAbove: zonesAbove.slice(0, 5),
        zonesBelow: zonesBelow.slice(0, 5)
      };

      logger.log(`[useLiquidationPools] Coinglass result:`, {
        method: result.method,
        heatLevel: result.heatLevel,
        longPool: `$${result.longLiquidationPool.price.toFixed(0)}`,
        shortPool: `$${result.shortLiquidationPool.price.toFixed(0)}`,
      });

      return result;
    }

    // FALLBACK: Use ATR-based intelligent calculation
    logger.log(`[useLiquidationPools] Using ATR fallback for ${asset} ${timeframe}`);

    const intelligentData = calculateIntelligentZones(
      currentPrice,
      asset,
      timeframe,
      candles,
      derivativesData,
      volatility
    );

    if (!intelligentData) {
      logger.warn('[useLiquidationPools] Intelligent calculation returned null');
      return null;
    }

    // Convert to LiquidationData format (backward compatible)
    const result: LiquidationData = {
      longLiquidationPool: intelligentData.longLiquidationPool,
      shortLiquidationPool: intelligentData.shortLiquidationPool,
      suggestedStopLoss: intelligentData.suggestedStopLoss,
      suggestedStopLossPercent: intelligentData.suggestedStopLossPercent,
      riskLevel: intelligentData.riskLevel,
      method: intelligentData.method,
      heatLevel: intelligentData.heatLevel,
      calculationReason: coinglassError
        ? `${intelligentData.calculationReason} (Coinglass no disponible)`
        : intelligentData.calculationReason,
      atrValue: intelligentData.atrValue,
      volatilityMultiplier: intelligentData.volatilityMultiplier
    };

    logger.log(`[useLiquidationPools] ATR zones ready:`, {
      method: result.method,
      heatLevel: result.heatLevel,
      longPool: `$${result.longLiquidationPool.price.toFixed(0)}`,
      shortPool: `$${result.shortLiquidationPool.price.toFixed(0)}`
    });

    return result;
  }, [currentPrice, asset, timeframe, candles, derivativesData, volatility, coinglassData, coinglassError]);
}
