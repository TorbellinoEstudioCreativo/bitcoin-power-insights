// ============================================================================
// INTELLIGENT LIQUIDATION ZONES CALCULATION
// ============================================================================
// Replaces fixed percentage liquidation zones with dynamic ATR + volatility
// based calculations that adapt to market conditions and timeframe
// ============================================================================

import { IntradayTimeframe, IntradayCandle } from '@/hooks/useIntradayData';
import { DerivativesData } from '@/lib/derivatives';

// ============================================================================
// TYPES
// ============================================================================

export interface IntelligentLiquidationZone {
  price: number;
  type: 'long' | 'short';
  estimatedLiquidity: string;
  distancePercent: number;
}

export interface IntelligentLiquidationData {
  longLiquidationPool: IntelligentLiquidationZone;
  shortLiquidationPool: IntelligentLiquidationZone;
  suggestedStopLoss: number;
  suggestedStopLossPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  // New fields for intelligent calculation
  method: 'atr_volatility' | 'coinglass_real' | 'fallback_fixed';
  heatLevel: 'hot' | 'warm' | 'cold';
  calculationReason: string;
  atrValue?: number;
  volatilityMultiplier?: number;
}

// ============================================================================
// TIMEFRAME CONFIGURATION
// ============================================================================

interface TimeframeLiquidationConfig {
  atrMultiplier: number;
  baseDistancePercent: number;
  slBufferPercent: number;
  atrPeriod: number;
}

export const TIMEFRAME_LIQUIDATION_CONFIG: Record<IntradayTimeframe, TimeframeLiquidationConfig> = {
  '5m': {
    atrMultiplier: 1.5,
    baseDistancePercent: 1.0,
    slBufferPercent: 0.3,
    atrPeriod: 14
  },
  '15m': {
    atrMultiplier: 2.0,
    baseDistancePercent: 1.5,
    slBufferPercent: 0.5,
    atrPeriod: 14
  },
  '30m': {
    atrMultiplier: 2.5,
    baseDistancePercent: 2.0,
    slBufferPercent: 0.7,
    atrPeriod: 14
  },
  '1h': {
    atrMultiplier: 3.0,
    baseDistancePercent: 2.5,
    slBufferPercent: 0.8,
    atrPeriod: 14
  },
  '4h': {
    atrMultiplier: 4.0,
    baseDistancePercent: 3.5,
    slBufferPercent: 1.0,
    atrPeriod: 14
  }
};

// Liquidity multipliers by asset
const ASSET_LIQUIDITY_BASE: Record<string, number> = {
  BTC: 50,
  ETH: 30,
  BNB: 10
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate ATR (Average True Range) from candle data
 */
export function calculateATRFromCandles(
  candles: IntradayCandle[],
  period: number = 14
): number | null {
  if (!candles || candles.length < period + 1) {
    console.log(`[ATR] Insufficient candles: ${candles?.length ?? 0} < ${period + 1}`);
    return null;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length && trueRanges.length < period; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const highLow = current.high - current.low;
    const highPrevClose = Math.abs(current.high - previous.close);
    const lowPrevClose = Math.abs(current.low - previous.close);

    const trueRange = Math.max(highLow, highPrevClose, lowPrevClose);
    trueRanges.push(trueRange);
  }

  if (trueRanges.length < period) {
    return null;
  }

  const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / period;
  return atr;
}

/**
 * Calculate derivatives-based multiplier from OI and Funding Rate
 */
export function calculateDerivativesMultiplier(
  derivativesData: DerivativesData | null
): { multiplier: number; reason: string } {
  if (!derivativesData) {
    return { multiplier: 1.0, reason: 'Sin datos de derivados' };
  }

  let multiplier = 1.0;
  const reasons: string[] = [];

  // Adjust based on funding rate extremes
  const fundingRate = derivativesData.fundingRate.fundingRatePercent;
  if (Math.abs(fundingRate) > 0.05) {
    // Extreme funding = tighter liquidation zones (more aggressive)
    multiplier *= 0.85;
    reasons.push(`FR extremo (${fundingRate.toFixed(3)}%)`);
  } else if (Math.abs(fundingRate) > 0.02) {
    multiplier *= 0.92;
    reasons.push(`FR alto (${fundingRate.toFixed(3)}%)`);
  }

  // Adjust based on OI change
  const oiChange = derivativesData.openInterest.change24h;
  if (oiChange > 10) {
    // Large OI increase = more liquidity accumulating = potentially tighter zones
    multiplier *= 0.9;
    reasons.push(`OI +${oiChange.toFixed(1)}%`);
  } else if (oiChange < -10) {
    // Large OI decrease = liquidity exiting = potentially wider zones
    multiplier *= 1.15;
    reasons.push(`OI ${oiChange.toFixed(1)}%`);
  }

  return {
    multiplier,
    reason: reasons.length > 0 ? reasons.join(', ') : 'Derivados normales'
  };
}

/**
 * Determine heat level based on distance and volatility
 */
function determineHeatLevel(
  distancePercent: number,
  volatilityLevel: number,
  timeframe: IntradayTimeframe
): 'hot' | 'warm' | 'cold' {
  const config = TIMEFRAME_LIQUIDATION_CONFIG[timeframe];
  const baseDistance = config.baseDistancePercent;

  // Adjust thresholds based on timeframe
  const hotThreshold = baseDistance * 0.6;
  const warmThreshold = baseDistance * 1.2;

  if (distancePercent < hotThreshold || volatilityLevel > 2.5) {
    return 'hot';
  } else if (distancePercent < warmThreshold || volatilityLevel > 1.5) {
    return 'warm';
  }
  return 'cold';
}

/**
 * Format liquidity estimate
 */
function formatLiquidity(baseLiquidity: number, asset: string): string {
  const assetBase = ASSET_LIQUIDITY_BASE[asset] ?? 20;
  const value = baseLiquidity * (assetBase / 50);
  return `~$${value.toFixed(0)}M`;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export function calculateIntelligentZones(
  currentPrice: number,
  asset: string,
  timeframe: IntradayTimeframe,
  candles: IntradayCandle[],
  derivativesData: DerivativesData | null,
  volatility: number = 1.0
): IntelligentLiquidationData | null {
  if (!currentPrice || currentPrice <= 0) {
    return null;
  }

  const config = TIMEFRAME_LIQUIDATION_CONFIG[timeframe];
  const reasonParts: string[] = [];

  console.log(`[LiquidationCalc] Starting calculation for ${asset} ${timeframe} @ $${currentPrice.toFixed(2)}`);

  // Step 1: Calculate ATR if candles available
  let atrValue: number | null = null;
  let atrBasedDistance: number | null = null;

  if (candles && candles.length >= config.atrPeriod + 1) {
    atrValue = calculateATRFromCandles(candles, config.atrPeriod);
    if (atrValue !== null) {
      // Convert ATR to percentage and apply multiplier
      const atrPercent = (atrValue / currentPrice) * 100;
      atrBasedDistance = atrPercent * config.atrMultiplier;
      reasonParts.push(`ATR: ${atrPercent.toFixed(2)}%`);
      console.log(`[LiquidationCalc] ATR calculated: $${atrValue.toFixed(2)} (${atrPercent.toFixed(2)}%)`);
    }
  }

  // Step 2: Get derivatives multiplier
  const { multiplier: derivativesMultiplier, reason: derivReason } = 
    calculateDerivativesMultiplier(derivativesData);
  if (derivativesMultiplier !== 1.0) {
    reasonParts.push(derivReason);
  }

  // Step 3: Calculate final distance
  let finalDistance: number;
  let method: IntelligentLiquidationData['method'];

  if (atrBasedDistance !== null) {
    // Use ATR-based calculation
    finalDistance = atrBasedDistance * derivativesMultiplier;
    method = 'atr_volatility';
    console.log(`[LiquidationCalc] Using ATR method: ${atrBasedDistance.toFixed(2)}% * ${derivativesMultiplier.toFixed(2)} = ${finalDistance.toFixed(2)}%`);
  } else {
    // Fallback to volatility-adjusted base distance
    finalDistance = config.baseDistancePercent * (1 + volatility * 0.1) * derivativesMultiplier;
    method = 'fallback_fixed';
    reasonParts.push('Fallback: volatilidad');
    console.log(`[LiquidationCalc] Using fallback method: ${config.baseDistancePercent}% * vol adj = ${finalDistance.toFixed(2)}%`);
  }

  // Ensure minimum and maximum bounds
  const minDistance = config.baseDistancePercent * 0.5;
  const maxDistance = config.baseDistancePercent * 3.0;
  finalDistance = Math.max(minDistance, Math.min(maxDistance, finalDistance));

  // Step 4: Calculate prices
  const longLiquidationPrice = currentPrice * (1 - finalDistance / 100);
  const shortLiquidationPrice = currentPrice * (1 + finalDistance / 100);
  
  // Step 5: Calculate stop loss (below long liquidation with buffer)
  const slDistance = finalDistance + config.slBufferPercent;
  const suggestedStopLoss = currentPrice * (1 - slDistance / 100);
  const suggestedStopLossPercent = slDistance;

  // Step 6: Determine risk and heat levels
  const riskLevel: 'low' | 'medium' | 'high' = 
    volatility > 2 || finalDistance < config.baseDistancePercent * 0.7 ? 'high' :
    volatility > 1.2 || finalDistance < config.baseDistancePercent ? 'medium' : 'low';

  const heatLevel = determineHeatLevel(finalDistance, volatility, timeframe);

  // Step 7: Build result
  const baseLiquidity = ASSET_LIQUIDITY_BASE[asset] ?? 20;

  const result: IntelligentLiquidationData = {
    longLiquidationPool: {
      price: longLiquidationPrice,
      type: 'long',
      estimatedLiquidity: formatLiquidity(baseLiquidity, asset),
      distancePercent: finalDistance
    },
    shortLiquidationPool: {
      price: shortLiquidationPrice,
      type: 'short',
      estimatedLiquidity: formatLiquidity(baseLiquidity * 0.8, asset),
      distancePercent: finalDistance
    },
    suggestedStopLoss,
    suggestedStopLossPercent,
    riskLevel,
    method,
    heatLevel,
    calculationReason: reasonParts.length > 0 
      ? `Calculado: ${reasonParts.join(' | ')}` 
      : `Timeframe ${timeframe} config base`,
    atrValue: atrValue ?? undefined,
    volatilityMultiplier: derivativesMultiplier
  };

  console.log(`[LiquidationCalc] ✅ Result:`, {
    method,
    heatLevel,
    longPool: `$${longLiquidationPrice.toFixed(0)} (-${finalDistance.toFixed(1)}%)`,
    shortPool: `$${shortLiquidationPrice.toFixed(0)} (+${finalDistance.toFixed(1)}%)`,
    sl: `$${suggestedStopLoss.toFixed(0)} (-${slDistance.toFixed(1)}%)`,
    reason: result.calculationReason
  });

  return result;
}
