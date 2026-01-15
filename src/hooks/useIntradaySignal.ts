import { useMemo } from 'react';
import { IntradayData } from './useIntradayData';
import { DerivativesData } from '@/lib/derivatives';

// ============================================================================
// TYPES
// ============================================================================

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface SignalFactor {
  label: string;
  positive: boolean;
  weight: number;
}

export interface IntradaySignal {
  direction: SignalDirection;
  confidence: number; // 0-100
  factors: SignalFactor[];
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
}

// ============================================================================
// SIGNAL CALCULATION
// ============================================================================

export function useIntradaySignal(
  intradayData: IntradayData | null | undefined,
  derivativesData: DerivativesData | null | undefined
): IntradaySignal | null {
  return useMemo(() => {
    if (!intradayData) return null;

    console.log('[useIntradaySignal] Calculating signal...');

    const { currentPrice, emas, change24h, volatility } = intradayData;
    const factors: SignalFactor[] = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // =========================================================================
    // FACTOR 1: EMA Alignment (Weight: 25)
    // =========================================================================
    if (emas.ema9 !== null && emas.ema21 !== null && emas.ema50 !== null) {
      const perfectBullish = emas.ema9 > emas.ema21 && emas.ema21 > emas.ema50;
      const perfectBearish = emas.ema9 < emas.ema21 && emas.ema21 < emas.ema50;
      
      if (perfectBullish) {
        factors.push({ label: 'EMAs alineadas alcistas (9>21>50)', positive: true, weight: 25 });
        bullishScore += 25;
      } else if (perfectBearish) {
        factors.push({ label: 'EMAs alineadas bajistas (9<21<50)', positive: false, weight: 25 });
        bearishScore += 25;
      } else {
        factors.push({ label: 'EMAs sin alineación clara', positive: false, weight: 10 });
      }
    }

    // =========================================================================
    // FACTOR 2: Price vs EMA9 (Weight: 15)
    // =========================================================================
    if (emas.ema9 !== null) {
      const aboveEma9 = currentPrice > emas.ema9;
      const distancePercent = Math.abs((currentPrice - emas.ema9) / emas.ema9) * 100;
      
      if (aboveEma9) {
        factors.push({ label: `Precio sobre EMA9 (+${distancePercent.toFixed(1)}%)`, positive: true, weight: 15 });
        bullishScore += 15;
      } else {
        factors.push({ label: `Precio bajo EMA9 (-${distancePercent.toFixed(1)}%)`, positive: false, weight: 15 });
        bearishScore += 15;
      }
    }

    // =========================================================================
    // FACTOR 3: 24h Momentum (Weight: 20)
    // =========================================================================
    if (change24h > 2) {
      factors.push({ label: `Momentum fuerte alcista (+${change24h.toFixed(1)}%)`, positive: true, weight: 20 });
      bullishScore += 20;
    } else if (change24h > 0) {
      factors.push({ label: `Momentum moderado (+${change24h.toFixed(1)}%)`, positive: true, weight: 10 });
      bullishScore += 10;
    } else if (change24h < -2) {
      factors.push({ label: `Momentum fuerte bajista (${change24h.toFixed(1)}%)`, positive: false, weight: 20 });
      bearishScore += 20;
    } else {
      factors.push({ label: `Momentum débil (${change24h.toFixed(1)}%)`, positive: false, weight: 10 });
      bearishScore += 10;
    }

    // =========================================================================
    // FACTOR 4: Volatility (Weight: 10)
    // =========================================================================
    if (volatility < 1) {
      factors.push({ label: 'Volatilidad baja (favorable)', positive: true, weight: 10 });
      bullishScore += 5;
    } else if (volatility > 2) {
      factors.push({ label: 'Volatilidad alta (riesgo elevado)', positive: false, weight: 10 });
      bearishScore += 5;
    } else {
      factors.push({ label: 'Volatilidad moderada', positive: true, weight: 5 });
    }

    // =========================================================================
    // FACTOR 5: Derivatives Data (Weight: 30)
    // =========================================================================
    if (derivativesData) {
      const { fundingRate, openInterest } = derivativesData;
      
      // Funding Rate Analysis
      const fundingPercent = fundingRate.fundingRatePercent;
      if (fundingPercent > 0.05) {
        factors.push({ label: 'Funding alto (presión vendedora)', positive: false, weight: 15 });
        bearishScore += 15;
      } else if (fundingPercent < -0.01) {
        factors.push({ label: 'Funding negativo (presión compradora)', positive: true, weight: 15 });
        bullishScore += 15;
      } else {
        factors.push({ label: 'Funding neutral', positive: true, weight: 5 });
        bullishScore += 5;
      }
      
      // Open Interest Analysis
      const oiChange = openInterest.change24h;
      if (oiChange > 5 && change24h > 0) {
        factors.push({ label: 'OI subiendo con precio (confirmación alcista)', positive: true, weight: 15 });
        bullishScore += 15;
      } else if (oiChange > 5 && change24h < 0) {
        factors.push({ label: 'OI subiendo con caída (presión bajista)', positive: false, weight: 15 });
        bearishScore += 15;
      } else if (oiChange < -5) {
        factors.push({ label: 'OI cayendo (cierre de posiciones)', positive: false, weight: 10 });
      } else {
        factors.push({ label: 'OI estable', positive: true, weight: 5 });
      }
    }

    // =========================================================================
    // CALCULATE FINAL SIGNAL
    // =========================================================================
    const totalScore = bullishScore + bearishScore;
    const netScore = bullishScore - bearishScore;
    
    let direction: SignalDirection;
    let confidence: number;
    
    if (netScore > 15) {
      direction = 'LONG';
      confidence = Math.min(95, 50 + netScore);
    } else if (netScore < -15) {
      direction = 'SHORT';
      confidence = Math.min(95, 50 + Math.abs(netScore));
    } else {
      direction = 'NEUTRAL';
      confidence = 50 - Math.abs(netScore);
    }

    // =========================================================================
    // CALCULATE TRADING LEVELS
    // =========================================================================
    const riskPercent = direction === 'LONG' ? 2.5 : 2.5;
    const reward1Percent = 1.5;
    const reward2Percent = 3.0;
    const reward3Percent = 5.0;
    
    let entryPrice = currentPrice;
    let stopLoss: number;
    let takeProfit1: number;
    let takeProfit2: number;
    let takeProfit3: number;
    
    if (direction === 'LONG') {
      stopLoss = currentPrice * (1 - riskPercent / 100);
      takeProfit1 = currentPrice * (1 + reward1Percent / 100);
      takeProfit2 = currentPrice * (1 + reward2Percent / 100);
      takeProfit3 = currentPrice * (1 + reward3Percent / 100);
    } else if (direction === 'SHORT') {
      stopLoss = currentPrice * (1 + riskPercent / 100);
      takeProfit1 = currentPrice * (1 - reward1Percent / 100);
      takeProfit2 = currentPrice * (1 - reward2Percent / 100);
      takeProfit3 = currentPrice * (1 - reward3Percent / 100);
    } else {
      // Neutral - no trade
      stopLoss = currentPrice * 0.975;
      takeProfit1 = currentPrice * 1.015;
      takeProfit2 = currentPrice * 1.03;
      takeProfit3 = currentPrice * 1.05;
    }
    
    const riskRewardRatio = reward2Percent / riskPercent;

    const signal: IntradaySignal = {
      direction,
      confidence,
      factors,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      riskRewardRatio
    };

    console.log(`[useIntradaySignal] ✅ Signal: ${direction} (${confidence.toFixed(0)}% confidence)`, {
      bullishScore,
      bearishScore,
      netScore,
      factors: factors.length
    });

    return signal;
  }, [intradayData, derivativesData]);
}
