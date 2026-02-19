import { useMemo } from 'react';
import { IntradayData, IntradayTimeframe, AllTimeframes } from './useIntradayData';
import { DerivativesData } from '@/lib/derivatives';
import { calculateIntradayTPs, IntradayTPLevels } from '@/lib/intradayCalculations';
import { logger } from '@/lib/logger';
import {
  generateMultiTFRecommendation,
  getDirectionFromEMAs,
  getEMAAlignment,
  getSequentialAdjacentTFs,
  TimeframeSignal
} from '@/lib/multiTimeframeAnalysis';

// ============================================================================
// TYPES
// ============================================================================

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface SignalFactor {
  label: string;
  positive: boolean;
  weight: number;
}

export interface AdjacentSignalInfo {
  timeframe: string;
  direction: string;
  confidence: number;
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
  // Dynamic TP data
  expectedDuration: string;
  basedOnATR: boolean;
  tp1Percent: number;
  tp2Percent: number;
  tp3Percent: number;
  stopLossPercent: number;
  // Multi-TF Confluence data
  confluenceScore?: number;
  adjustedConfidence?: number;
  multiTFRecommendation?: string;
  multiTFWarnings?: string[];
  adjacentSignals?: {
    lower?: AdjacentSignalInfo;
    upper?: AdjacentSignalInfo;
  };
}

// ============================================================================
// SIGNAL CALCULATION
// ============================================================================

export interface AdjacentTFData {
  signals: Array<{
    timeframe: AllTimeframes;
    data: IntradayData | null;
  }>;
}

export function useIntradaySignal(
  intradayData: IntradayData | null | undefined,
  derivativesData: DerivativesData | null | undefined,
  timeframe: IntradayTimeframe = '15m',
  adjacentData?: AdjacentTFData
): IntradaySignal | null {
  return useMemo(() => {
    if (!intradayData) return null;

    logger.log('[useIntradaySignal] Calculating signal for timeframe:', timeframe);

    const { currentPrice, emas, change24h, volatility, candles } = intradayData;
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
    // CALCULATE DYNAMIC TRADING LEVELS
    // =========================================================================
    const candleData = candles?.map(c => ({
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const tpLevels: IntradayTPLevels = calculateIntradayTPs(
      currentPrice,
      direction,
      timeframe,
      candleData
    );

    // =========================================================================
    // MULTI-TIMEFRAME CONFLUENCE ANALYSIS
    // =========================================================================
    let confluenceScore: number | undefined;
    let adjustedConfidence: number | undefined;
    let multiTFRecommendation: string | undefined;
    let multiTFWarnings: string[] | undefined;
    let adjacentSignals: IntradaySignal['adjacentSignals'];

    if (adjacentData && adjacentData.signals.length > 0) {
      const adjacentTFSignals: TimeframeSignal[] = [];

      // Get the sequential adjacent TFs for proper filtering
      const { previous, next } = getSequentialAdjacentTFs(timeframe);
      const relevantTFs = [previous, next].filter(Boolean);

      // Build signals from adjacent timeframes (only sequential ones)
      adjacentData.signals.forEach(({ timeframe: tfName, data }) => {
        // Only include signals from sequential adjacent TFs
        if (data && relevantTFs.includes(tfName as IntradayTimeframe)) {
          const tfEmas = data.emas;
          const tfDirection = getDirectionFromEMAs(tfEmas.ema9, tfEmas.ema21, tfEmas.ema50);
          const tfAlignment = getEMAAlignment(tfEmas.ema9, tfEmas.ema21, tfEmas.ema50);

          // Calculate confidence based on EMA alignment and momentum
          let tfConfidence = 50;
          if (tfAlignment === 'bullish' || tfAlignment === 'bearish') {
            tfConfidence = 65;
            // Add momentum bonus
            const momentum = Math.abs(data.change24h || 0);
            if (momentum > 2) tfConfidence += 15;
            else if (momentum > 1) tfConfidence += 10;
          }

          adjacentTFSignals.push({
            timeframe: tfName,
            direction: tfDirection,
            confidence: Math.min(90, tfConfidence),
            emaAlignment: tfAlignment
          });

          // Store for UI display
          if (tfName === previous) {
            adjacentSignals = {
              ...adjacentSignals,
              lower: {
                timeframe: tfName,
                direction: tfDirection,
                confidence: tfConfidence
              }
            };
          } else if (tfName === next) {
            adjacentSignals = {
              ...adjacentSignals,
              upper: {
                timeframe: tfName,
                direction: tfDirection,
                confidence: tfConfidence
              }
            };
          }
        }
      });

      // Apply confluence analysis if we have adjacent signals
      if (adjacentTFSignals.length > 0) {
        const currentTFSignal: TimeframeSignal = {
          timeframe,
          direction,
          confidence,
          emaAlignment: getEMAAlignment(emas.ema9, emas.ema21, emas.ema50)
        };

        const confluenceResult = generateMultiTFRecommendation(currentTFSignal, adjacentTFSignals);
        confluenceScore = confluenceResult.confluenceScore;
        adjustedConfidence = confluenceResult.adjustedConfidence;
        multiTFRecommendation = confluenceResult.recommendation;
        multiTFWarnings = confluenceResult.warnings;

        logger.log('[useIntradaySignal] Multi-TF Confluence:', {
          original: `${confidence.toFixed(0)}%`,
          adjusted: `${adjustedConfidence}%`,
          confluenceScore: `${confluenceScore}%`,
          recommendation: multiTFRecommendation,
        });
      }
    }

    const signal: IntradaySignal = {
      direction,
      confidence: adjustedConfidence ?? confidence,
      factors,
      entryPrice: currentPrice,
      stopLoss: tpLevels.stopLoss,
      takeProfit1: tpLevels.tp1,
      takeProfit2: tpLevels.tp2,
      takeProfit3: tpLevels.tp3,
      riskRewardRatio: tpLevels.riskRewardRatio,
      // Dynamic TP data
      expectedDuration: tpLevels.expectedDuration,
      basedOnATR: tpLevels.basedOnATR,
      tp1Percent: tpLevels.tp1Percent,
      tp2Percent: tpLevels.tp2Percent,
      tp3Percent: tpLevels.tp3Percent,
      stopLossPercent: tpLevels.stopLossPercent,
      // Multi-TF Confluence data
      confluenceScore,
      adjustedConfidence,
      multiTFRecommendation,
      multiTFWarnings,
      adjacentSignals
    };

    logger.log(`[useIntradaySignal] Signal: ${direction} (${signal.confidence.toFixed(0)}% confidence)`, {
      bullishScore,
      bearishScore,
      netScore,
      factors: factors.length,
      timeframe,
    });

    return signal;
  }, [intradayData, derivativesData, timeframe, adjacentData]);
}
