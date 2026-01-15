import { useMemo } from 'react';
import { IntradayData } from './useIntradayData';
import { SignalDirection } from './useIntradaySignal';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimalEntryZone {
  low: number;
  high: number;
}

export interface OptimalEntryData {
  isOptimal: boolean;              // Is it worth waiting for pullback?
  zone: OptimalEntryZone;          // Optimal price range
  suggestedPrice: number;          // Specific price for limit order
  distancePercent: number;         // % below/above current price
  watchTimeframe: string;          // Timeframe to monitor (5m/15m)
  triggerCondition: string;        // What to wait for (e.g. "Price touches EMA9")
  currentRR: string;               // R:R with immediate entry
  optimalRR: string;               // R:R with optimal entry
  advantagePercent: number;        // % improvement in R:R
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Calculate optimal entry zone based on:
 * 1. EMAs from current timeframe
 * 2. Current price distance from EMAs
 * 3. Direction of signal (LONG/SHORT)
 */
export function useOptimalEntry(
  intradayData: IntradayData | null | undefined,
  direction: SignalDirection | undefined,
  currentRR: number
): OptimalEntryData | null {
  return useMemo(() => {
    if (!intradayData || !direction || direction === 'NEUTRAL') {
      return null;
    }

    const { currentPrice, emas } = intradayData;
    const { ema9, ema21 } = emas;

    if (ema9 === null || ema21 === null) {
      return null;
    }

    console.log(`[useOptimalEntry] Calculating for ${direction}...`, {
      currentPrice,
      ema9,
      ema21
    });

    // Calculate distance from current price to EMA9
    const distanceToEMA9 = Math.abs((currentPrice - ema9) / currentPrice * 100);
    
    // Threshold: if price is within 0.3% of EMA9, immediate entry is fine
    const OPTIMAL_THRESHOLD = 0.3;

    if (distanceToEMA9 < OPTIMAL_THRESHOLD) {
      console.log(`[useOptimalEntry] Price close to EMA9 (${distanceToEMA9.toFixed(2)}%), immediate entry OK`);
      return {
        isOptimal: false,
        zone: { low: currentPrice, high: currentPrice },
        suggestedPrice: currentPrice,
        distancePercent: 0,
        watchTimeframe: '5m',
        triggerCondition: 'Entrar ahora - precio óptimo',
        currentRR: `1:${currentRR.toFixed(1)}`,
        optimalRR: `1:${currentRR.toFixed(1)}`,
        advantagePercent: 0
      };
    }

    // Calculate optimal zone based on direction
    let zoneLow: number;
    let zoneHigh: number;
    let suggestedPrice: number;
    let triggerCondition: string;

    if (direction === 'LONG') {
      // For LONG: wait for pullback to EMA zone
      zoneLow = Math.min(ema9, ema21);
      zoneHigh = Math.max(ema9, ema21);
      suggestedPrice = ema9; // Entry at EMA9 (more conservative)
      triggerCondition = 'Precio toca EMA9';
    } else {
      // For SHORT: wait for rally to EMA zone
      zoneLow = Math.min(ema9, ema21);
      zoneHigh = Math.max(ema9, ema21);
      suggestedPrice = ema9;
      triggerCondition = 'Precio sube a EMA9';
    }

    // Calculate distance to optimal zone
    const distancePercent = Math.abs((currentPrice - suggestedPrice) / currentPrice * 100);

    // Calculate improved R:R
    // With better entry, risk is reduced and reward is increased
    const stopLossPercent = 2.5; // Standard 2.5% SL
    const currentRisk = currentPrice * (stopLossPercent / 100);
    const optimalRisk = suggestedPrice * (stopLossPercent / 100);
    
    // Calculate the improvement in R:R
    const riskImprovement = direction === 'LONG' 
      ? (currentPrice - suggestedPrice) / optimalRisk
      : (suggestedPrice - currentPrice) / optimalRisk;
    
    const improvedRR = currentRR + riskImprovement;
    const advantagePercent = ((improvedRR - currentRR) / currentRR) * 100;

    console.log(`[useOptimalEntry] ✅ Optimal zone calculated:`, {
      zone: `${zoneLow.toFixed(0)} - ${zoneHigh.toFixed(0)}`,
      suggestedPrice: suggestedPrice.toFixed(0),
      distancePercent: `${distancePercent.toFixed(2)}%`,
      currentRR: `1:${currentRR.toFixed(1)}`,
      optimalRR: `1:${improvedRR.toFixed(1)}`,
      advantage: `+${advantagePercent.toFixed(0)}%`
    });

    return {
      isOptimal: true,
      zone: { low: zoneLow, high: zoneHigh },
      suggestedPrice: Math.round(suggestedPrice),
      distancePercent,
      watchTimeframe: '15m',
      triggerCondition,
      currentRR: `1:${currentRR.toFixed(1)}`,
      optimalRR: `1:${improvedRR.toFixed(1)}`,
      advantagePercent: Math.max(0, advantagePercent)
    };
  }, [intradayData, direction, currentRR]);
}
