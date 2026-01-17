import { useMemo } from 'react';
import { IntradayAsset, IntradayTimeframe, IntradayCandle } from './useIntradayData';
import { DerivativesData } from '@/lib/derivatives';
import { 
  calculateIntelligentZones, 
  IntelligentLiquidationData 
} from '@/lib/liquidationCalculations';

// ============================================================================
// TYPES (Extended for backward compatibility)
// ============================================================================

export interface LiquidationPool {
  price: number;
  type: 'long' | 'short';
  estimatedLiquidity: string;
  distancePercent: number;
}

export interface LiquidationData {
  longLiquidationPool: LiquidationPool;
  shortLiquidationPool: LiquidationPool;
  suggestedStopLoss: number;
  suggestedStopLossPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  // New intelligent calculation fields
  method: 'atr_volatility' | 'coinglass_real' | 'fallback_fixed';
  heatLevel: 'hot' | 'warm' | 'cold';
  calculationReason: string;
  atrValue?: number;
  volatilityMultiplier?: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Calculates intelligent liquidation zones based on ATR, volatility, and derivatives data.
 * Adapts zones dynamically based on timeframe and market conditions.
 */
export function useLiquidationPools(
  currentPrice: number,
  asset: IntradayAsset = 'BTC',
  timeframe: IntradayTimeframe = '15m',
  candles: IntradayCandle[] = [],
  derivativesData: DerivativesData | null = null,
  volatility: number = 1.0
): LiquidationData | null {
  return useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null;

    console.log(`[useLiquidationPools] Calculating intelligent zones for ${asset} ${timeframe} @ $${currentPrice.toFixed(2)}`);

    // Use intelligent calculation
    const intelligentData = calculateIntelligentZones(
      currentPrice,
      asset,
      timeframe,
      candles,
      derivativesData,
      volatility
    );

    if (!intelligentData) {
      console.warn('[useLiquidationPools] Intelligent calculation returned null');
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
      calculationReason: intelligentData.calculationReason,
      atrValue: intelligentData.atrValue,
      volatilityMultiplier: intelligentData.volatilityMultiplier
    };

    console.log(`[useLiquidationPools] ✅ Zones ready:`, {
      method: result.method,
      heatLevel: result.heatLevel,
      longPool: `$${result.longLiquidationPool.price.toFixed(0)}`,
      shortPool: `$${result.shortLiquidationPool.price.toFixed(0)}`
    });

    return result;
  }, [currentPrice, asset, timeframe, candles, derivativesData, volatility]);
}
