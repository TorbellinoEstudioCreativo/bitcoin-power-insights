import { useMemo } from 'react';
import { IntradayAsset } from './useIntradayData';

// ============================================================================
// TYPES
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
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Typical liquidation zones based on common leverage levels
const LIQUIDATION_DISTANCE_PERCENT = 2.5; // ±2.5% for ~40x leverage
const STOP_LOSS_BUFFER_PERCENT = 0.5; // 0.5% below liquidation pool

// Estimated liquidity multipliers by asset
const LIQUIDITY_MULTIPLIERS: Record<IntradayAsset, number> = {
  BTC: 1.0,
  ETH: 0.7,
  BNB: 0.3
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useLiquidationPools(
  currentPrice: number,
  asset: IntradayAsset = 'BTC',
  volatility: number = 1.0
): LiquidationData | null {
  return useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null;

    console.log(`[useLiquidationPools] Calculating pools for ${asset} at $${currentPrice.toFixed(2)}`);

    // Adjust liquidation distance based on volatility
    const adjustedDistance = LIQUIDATION_DISTANCE_PERCENT * (1 + volatility * 0.1);
    
    // Calculate liquidation pool prices
    const longLiquidationPrice = currentPrice * (1 - adjustedDistance / 100);
    const shortLiquidationPrice = currentPrice * (1 + adjustedDistance / 100);
    
    // Calculate stop loss (below long liquidation pool)
    const suggestedStopLoss = longLiquidationPrice * (1 - STOP_LOSS_BUFFER_PERCENT / 100);
    const suggestedStopLossPercent = ((currentPrice - suggestedStopLoss) / currentPrice) * 100;
    
    // Estimate liquidity based on asset and price
    const baseLiquidity = asset === 'BTC' ? 50 : asset === 'ETH' ? 30 : 10;
    const liquidityMultiplier = LIQUIDITY_MULTIPLIERS[asset];
    
    const formatLiquidity = (base: number): string => {
      const value = base * liquidityMultiplier;
      return `~$${value.toFixed(0)}M`;
    };

    // Determine risk level based on volatility
    const riskLevel: 'low' | 'medium' | 'high' = 
      volatility > 2 ? 'high' : volatility > 1 ? 'medium' : 'low';

    const result: LiquidationData = {
      longLiquidationPool: {
        price: longLiquidationPrice,
        type: 'long',
        estimatedLiquidity: formatLiquidity(baseLiquidity),
        distancePercent: adjustedDistance
      },
      shortLiquidationPool: {
        price: shortLiquidationPrice,
        type: 'short',
        estimatedLiquidity: formatLiquidity(baseLiquidity * 0.8),
        distancePercent: adjustedDistance
      },
      suggestedStopLoss,
      suggestedStopLossPercent,
      riskLevel
    };

    console.log(`[useLiquidationPools] ✅ Pools calculated:`, {
      longPool: `$${longLiquidationPrice.toFixed(2)} (-${adjustedDistance.toFixed(1)}%)`,
      shortPool: `$${shortLiquidationPrice.toFixed(2)} (+${adjustedDistance.toFixed(1)}%)`,
      sl: `$${suggestedStopLoss.toFixed(2)} (-${suggestedStopLossPercent.toFixed(1)}%)`,
      risk: riskLevel
    });

    return result;
  }, [currentPrice, asset, volatility]);
}
