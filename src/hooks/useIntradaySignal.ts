import { useMemo } from 'react';
import { IntradayData, IntradayTimeframe, AllTimeframes } from './useIntradayData';
import { DerivativesData } from '@/lib/derivatives';
import { calculateIntradayTPs, IntradayTPLevels } from '@/lib/intradayCalculations';
import { calculateSignal, SignalDirection, SignalFactor } from '@/lib/signalEngine';
import { logger } from '@/lib/logger';
import {
  generateMultiTFRecommendation,
  getEMAAlignment,
  getSequentialAdjacentTFs,
  TimeframeSignal
} from '@/lib/multiTimeframeAnalysis';

// Re-export types from signalEngine so consumers don't break
export type { SignalDirection, SignalFactor } from '@/lib/signalEngine';

// ============================================================================
// TYPES
// ============================================================================

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
// ADJACENT TF DATA
// ============================================================================

export interface AdjacentTFData {
  signals: Array<{
    timeframe: AllTimeframes;
    data: IntradayData | null;
  }>;
}

// ============================================================================
// HELPER: calculate adjacent TF signal using the same engine
// ============================================================================

function getAdjacentTFSignal(
  data: IntradayData,
  derivativesData: DerivativesData | null | undefined,
  tfName: AllTimeframes
): { direction: SignalDirection; confidence: number; emaAlignment: 'bullish' | 'bearish' | 'neutral' } {
  // Use the SAME signal engine for adjacent TFs
  const result = calculateSignal(data, derivativesData, tfName as IntradayTimeframe);
  const emaAlignment = getEMAAlignment(data.emas.ema9, data.emas.ema21, data.emas.ema50);
  return {
    direction: result.direction,
    confidence: result.confidence,
    emaAlignment,
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useIntradaySignal(
  intradayData: IntradayData | null | undefined,
  derivativesData: DerivativesData | null | undefined,
  timeframe: IntradayTimeframe = '15m',
  adjacentData?: AdjacentTFData
): IntradaySignal | null {
  return useMemo(() => {
    if (!intradayData) return null;

    logger.log('[useIntradaySignal] Calculating signal for timeframe:', timeframe);

    // =========================================================================
    // Use unified signal engine
    // =========================================================================
    const { direction, confidence: baseConfidence, factors } = calculateSignal(
      intradayData, derivativesData, timeframe
    );

    // =========================================================================
    // CALCULATE DYNAMIC TRADING LEVELS
    // =========================================================================
    const candleData = intradayData.candles?.map(c => ({
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const tpLevels: IntradayTPLevels = calculateIntradayTPs(
      intradayData.currentPrice,
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
      const { previous, next } = getSequentialAdjacentTFs(timeframe);
      const relevantTFs = [previous, next].filter(Boolean);

      adjacentData.signals.forEach(({ timeframe: tfName, data }) => {
        if (data && relevantTFs.includes(tfName as IntradayTimeframe)) {
          const adjSignal = getAdjacentTFSignal(data, derivativesData, tfName);

          adjacentTFSignals.push({
            timeframe: tfName,
            direction: adjSignal.direction,
            confidence: adjSignal.confidence,
            emaAlignment: adjSignal.emaAlignment
          });

          if (tfName === previous) {
            adjacentSignals = {
              ...adjacentSignals,
              lower: { timeframe: tfName, direction: adjSignal.direction, confidence: adjSignal.confidence }
            };
          } else if (tfName === next) {
            adjacentSignals = {
              ...adjacentSignals,
              upper: { timeframe: tfName, direction: adjSignal.direction, confidence: adjSignal.confidence }
            };
          }
        }
      });

      if (adjacentTFSignals.length > 0) {
        const emaAlignment = getEMAAlignment(
          intradayData.emas.ema9, intradayData.emas.ema21, intradayData.emas.ema50
        );
        const currentTFSignal: TimeframeSignal = {
          timeframe,
          direction,
          confidence: baseConfidence,
          emaAlignment
        };

        const confluenceResult = generateMultiTFRecommendation(currentTFSignal, adjacentTFSignals);
        confluenceScore = confluenceResult.confluenceScore;
        adjustedConfidence = confluenceResult.adjustedConfidence;
        multiTFRecommendation = confluenceResult.recommendation;
        multiTFWarnings = confluenceResult.warnings;

        logger.log('[useIntradaySignal] Multi-TF Confluence:', {
          original: `${baseConfidence.toFixed(0)}%`,
          adjusted: `${adjustedConfidence}%`,
          confluenceScore: `${confluenceScore}%`,
        });
      }
    }

    const finalConfidence = adjustedConfidence ?? baseConfidence;

    const signal: IntradaySignal = {
      direction,
      confidence: finalConfidence,
      factors,
      entryPrice: intradayData.currentPrice,
      stopLoss: tpLevels.stopLoss,
      takeProfit1: tpLevels.tp1,
      takeProfit2: tpLevels.tp2,
      takeProfit3: tpLevels.tp3,
      riskRewardRatio: tpLevels.riskRewardRatio,
      expectedDuration: tpLevels.expectedDuration,
      basedOnATR: tpLevels.basedOnATR,
      tp1Percent: tpLevels.tp1Percent,
      tp2Percent: tpLevels.tp2Percent,
      tp3Percent: tpLevels.tp3Percent,
      stopLossPercent: tpLevels.stopLossPercent,
      confluenceScore,
      adjustedConfidence,
      multiTFRecommendation,
      multiTFWarnings,
      adjacentSignals
    };

    logger.log(`[useIntradaySignal] Signal: ${direction} (${finalConfidence.toFixed(0)}% confidence)`);

    return signal;
  }, [intradayData, derivativesData, timeframe, adjacentData]);
}
