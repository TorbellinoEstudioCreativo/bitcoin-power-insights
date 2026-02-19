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
// DERIVATIVES WEIGHT SCALING BY TIMEFRAME
// Derivatives (funding, OI) move slowly — they matter more on HTF, less on LTF
// ============================================================================

const DERIVATIVES_WEIGHT_SCALE: Record<IntradayTimeframe, number> = {
  '1m': 0.3,
  '5m': 0.5,
  '15m': 0.7,
  '1h': 0.85,
  '4h': 1.0,
  '1d': 1.0,
};

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

    const { currentPrice, emas, rsi, macd, volume, change24h, volatility, candles } = intradayData;
    const factors: SignalFactor[] = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // =========================================================================
    // FACTOR 1: EMA Trend Structure + Crossover (Weight: 20)
    // Professional traders use EMA alignment for trend AND crossovers for timing
    // =========================================================================
    if (emas.ema9 !== null && emas.ema21 !== null && emas.ema50 !== null) {
      const perfectBullish = emas.ema9 > emas.ema21 && emas.ema21 > emas.ema50;
      const perfectBearish = emas.ema9 < emas.ema21 && emas.ema21 < emas.ema50;

      // Check for recent EMA9/EMA21 crossover (strong timing signal)
      const ema9Vals = emas.ema9Values;
      const ema21Vals = emas.ema21Values;
      let recentCrossover: 'bullish' | 'bearish' | null = null;

      if (ema9Vals.length >= 3 && ema21Vals.length >= 3) {
        const len = ema9Vals.length;
        // Check last 3 candles for crossover
        for (let i = len - 1; i >= len - 3 && i >= 1; i--) {
          const prevAbove = ema9Vals[i - 1] > ema21Vals[i - 1];
          const currAbove = ema9Vals[i] > ema21Vals[i];
          if (!isNaN(ema9Vals[i]) && !isNaN(ema21Vals[i]) &&
              !isNaN(ema9Vals[i - 1]) && !isNaN(ema21Vals[i - 1])) {
            if (!prevAbove && currAbove) { recentCrossover = 'bullish'; break; }
            if (prevAbove && !currAbove) { recentCrossover = 'bearish'; break; }
          }
        }
      }

      if (perfectBullish) {
        if (recentCrossover === 'bullish') {
          factors.push({ label: 'EMAs alcistas + cruce reciente 9/21', positive: true, weight: 20 });
          bullishScore += 20;
        } else {
          factors.push({ label: 'EMAs alineadas alcistas (9>21>50)', positive: true, weight: 15 });
          bullishScore += 15;
        }
      } else if (perfectBearish) {
        if (recentCrossover === 'bearish') {
          factors.push({ label: 'EMAs bajistas + cruce reciente 9/21', positive: false, weight: 20 });
          bearishScore += 20;
        } else {
          factors.push({ label: 'EMAs alineadas bajistas (9<21<50)', positive: false, weight: 15 });
          bearishScore += 15;
        }
      } else {
        // Mixed alignment — check if price is using EMA21 as support/resistance
        const aboveEma21 = currentPrice > emas.ema21;
        if (recentCrossover === 'bullish') {
          factors.push({ label: 'Cruce alcista EMA9/21 (posible cambio de tendencia)', positive: true, weight: 12 });
          bullishScore += 12;
        } else if (recentCrossover === 'bearish') {
          factors.push({ label: 'Cruce bajista EMA9/21 (posible cambio de tendencia)', positive: false, weight: 12 });
          bearishScore += 12;
        } else {
          factors.push({ label: `EMAs sin alineación clara, precio ${aboveEma21 ? 'sobre' : 'bajo'} EMA21`, positive: aboveEma21, weight: 5 });
          if (aboveEma21) bullishScore += 5; else bearishScore += 5;
        }
      }
    }

    // =========================================================================
    // FACTOR 2: RSI Momentum (Weight: 20)
    // RSI(14): overbought >70, oversold <30, momentum zone 40-60
    // Divergence: price makes new high but RSI doesn't = bearish divergence
    // =========================================================================
    if (rsi.current !== null) {
      const rsiVal = rsi.current;

      if (rsiVal > 70) {
        // Overbought — bearish pressure, especially if coming down
        if (rsi.previous !== null && rsi.current < rsi.previous) {
          factors.push({ label: `RSI sobrecomprado y cayendo (${rsiVal.toFixed(0)})`, positive: false, weight: 20 });
          bearishScore += 20;
        } else {
          factors.push({ label: `RSI sobrecomprado (${rsiVal.toFixed(0)})`, positive: false, weight: 15 });
          bearishScore += 15;
        }
      } else if (rsiVal < 30) {
        // Oversold — bullish pressure, especially if recovering
        if (rsi.previous !== null && rsi.current > rsi.previous) {
          factors.push({ label: `RSI sobrevendido y recuperando (${rsiVal.toFixed(0)})`, positive: true, weight: 20 });
          bullishScore += 20;
        } else {
          factors.push({ label: `RSI sobrevendido (${rsiVal.toFixed(0)})`, positive: true, weight: 15 });
          bullishScore += 15;
        }
      } else if (rsiVal >= 50 && rsiVal <= 70) {
        // Bullish momentum zone
        factors.push({ label: `RSI en zona alcista (${rsiVal.toFixed(0)})`, positive: true, weight: 10 });
        bullishScore += 10;
      } else if (rsiVal >= 30 && rsiVal < 50) {
        // Bearish momentum zone
        factors.push({ label: `RSI en zona bajista (${rsiVal.toFixed(0)})`, positive: false, weight: 10 });
        bearishScore += 10;
      }
    }

    // =========================================================================
    // FACTOR 3: MACD Signal (Weight: 20)
    // MACD crossovers + histogram direction = key momentum confirmation
    // =========================================================================
    if (macd.macd !== null && macd.signal !== null && macd.histogram !== null) {
      const hist = macd.histogram;
      const prevHist = macd.previousHistogram;
      const macdAboveSignal = macd.macd > macd.signal;

      // Histogram flip (most powerful MACD signal)
      const histogramFlipBullish = prevHist !== null && prevHist < 0 && hist > 0;
      const histogramFlipBearish = prevHist !== null && prevHist > 0 && hist < 0;

      if (histogramFlipBullish) {
        factors.push({ label: 'MACD histograma gira positivo (señal de compra)', positive: true, weight: 20 });
        bullishScore += 20;
      } else if (histogramFlipBearish) {
        factors.push({ label: 'MACD histograma gira negativo (señal de venta)', positive: false, weight: 20 });
        bearishScore += 20;
      } else if (macdAboveSignal && hist > 0) {
        // MACD above signal, growing histogram = bullish momentum
        const growing = prevHist !== null && hist > prevHist;
        if (growing) {
          factors.push({ label: 'MACD alcista con momentum creciente', positive: true, weight: 15 });
          bullishScore += 15;
        } else {
          factors.push({ label: 'MACD alcista pero momentum decreciente', positive: true, weight: 8 });
          bullishScore += 8;
        }
      } else if (!macdAboveSignal && hist < 0) {
        const growing = prevHist !== null && hist < prevHist;
        if (growing) {
          factors.push({ label: 'MACD bajista con momentum creciente', positive: false, weight: 15 });
          bearishScore += 15;
        } else {
          factors.push({ label: 'MACD bajista pero momentum decreciente', positive: false, weight: 8 });
          bearishScore += 8;
        }
      }
    }

    // =========================================================================
    // FACTOR 4: Volume Confirmation (Weight: 15)
    // Professional rule: "Volume precedes price"
    // Moves with above-average volume are more reliable
    // OBV trend confirms accumulation/distribution
    // =========================================================================
    if (volume.volumeRatio !== null) {
      const vr = volume.volumeRatio;
      const obvRising = volume.obv !== null && volume.obvPrevious !== null && volume.obv > volume.obvPrevious;
      const obvFalling = volume.obv !== null && volume.obvPrevious !== null && volume.obv < volume.obvPrevious;

      if (vr > 1.5) {
        // High volume — strong confirmation of current move
        if (change24h > 0 && obvRising) {
          factors.push({ label: `Volumen alto (${vr.toFixed(1)}x) + OBV subiendo`, positive: true, weight: 15 });
          bullishScore += 15;
        } else if (change24h < 0 && obvFalling) {
          factors.push({ label: `Volumen alto (${vr.toFixed(1)}x) + OBV cayendo`, positive: false, weight: 15 });
          bearishScore += 15;
        } else {
          // High volume but direction unclear
          factors.push({ label: `Volumen alto (${vr.toFixed(1)}x) sin dirección clara`, positive: false, weight: 5 });
        }
      } else if (vr > 0.8) {
        // Normal volume
        if (obvRising) {
          factors.push({ label: 'Volumen normal, OBV subiendo (acumulación)', positive: true, weight: 8 });
          bullishScore += 8;
        } else if (obvFalling) {
          factors.push({ label: 'Volumen normal, OBV cayendo (distribución)', positive: false, weight: 8 });
          bearishScore += 8;
        } else {
          factors.push({ label: 'Volumen normal', positive: true, weight: 3 });
        }
      } else {
        // Low volume — moves are unreliable, penalize confidence later
        factors.push({ label: `Volumen bajo (${vr.toFixed(1)}x) — movimiento poco confiable`, positive: false, weight: 5 });
      }
    }

    // =========================================================================
    // FACTOR 5: Price Action vs EMAs (Weight: 10)
    // Where is price relative to key EMAs? Using EMA as dynamic S/R
    // =========================================================================
    if (emas.ema9 !== null && emas.ema21 !== null) {
      const aboveEma9 = currentPrice > emas.ema9;
      const aboveEma21 = currentPrice > emas.ema21;

      if (aboveEma9 && aboveEma21) {
        factors.push({ label: 'Precio sobre EMA9 y EMA21 (tendencia alcista)', positive: true, weight: 10 });
        bullishScore += 10;
      } else if (!aboveEma9 && !aboveEma21) {
        factors.push({ label: 'Precio bajo EMA9 y EMA21 (tendencia bajista)', positive: false, weight: 10 });
        bearishScore += 10;
      } else {
        // Between EMAs = indecision
        factors.push({ label: 'Precio entre EMA9 y EMA21 (indecisión)', positive: false, weight: 3 });
      }
    }

    // =========================================================================
    // FACTOR 6: Derivatives (Funding Rate + Open Interest) (Weight: 15 scaled)
    // Weight scales by timeframe — less relevant for fast TFs
    // =========================================================================
    const derivScale = DERIVATIVES_WEIGHT_SCALE[timeframe];
    if (derivativesData) {
      const { fundingRate, openInterest } = derivativesData;
      const fundingPercent = fundingRate.fundingRatePercent;

      // Funding Rate — contrarian indicator at extremes
      if (fundingPercent > 0.05) {
        const pts = Math.round(10 * derivScale);
        factors.push({ label: `Funding alto ${fundingPercent.toFixed(3)}% (exceso de longs)`, positive: false, weight: pts });
        bearishScore += pts;
      } else if (fundingPercent < -0.01) {
        const pts = Math.round(10 * derivScale);
        factors.push({ label: `Funding negativo ${fundingPercent.toFixed(3)}% (exceso de shorts)`, positive: true, weight: pts });
        bullishScore += pts;
      } else {
        factors.push({ label: 'Funding neutral', positive: true, weight: 2 });
      }

      // Open Interest — confirms conviction behind moves
      const oiChange = openInterest.change24h;
      if (oiChange > 5 && change24h > 0) {
        const pts = Math.round(8 * derivScale);
        factors.push({ label: 'OI subiendo con precio (longs convictos)', positive: true, weight: pts });
        bullishScore += pts;
      } else if (oiChange > 5 && change24h < 0) {
        const pts = Math.round(8 * derivScale);
        factors.push({ label: 'OI subiendo con caída (shorts agresivos)', positive: false, weight: pts });
        bearishScore += pts;
      } else if (oiChange < -5) {
        const pts = Math.round(5 * derivScale);
        factors.push({ label: 'OI cayendo (cierre de posiciones — precaución)', positive: false, weight: pts });
      }
    }

    // =========================================================================
    // CALCULATE FINAL SIGNAL
    // =========================================================================
    const netScore = bullishScore - bearishScore;

    let direction: SignalDirection;
    let confidence: number;

    // Higher threshold (20 instead of 15) to reduce false signals
    if (netScore > 20) {
      direction = 'LONG';
      confidence = Math.min(95, 45 + netScore);
    } else if (netScore < -20) {
      direction = 'SHORT';
      confidence = Math.min(95, 45 + Math.abs(netScore));
    } else {
      direction = 'NEUTRAL';
      confidence = Math.max(20, 50 - Math.abs(netScore));
    }

    // =========================================================================
    // CONFIDENCE MODIFIERS (volatility + volume quality)
    // These don't affect direction, only how confident we are
    // =========================================================================
    if (volatility > 2.5) {
      // Extreme volatility reduces confidence
      confidence = Math.max(30, confidence - 10);
      factors.push({ label: `Volatilidad extrema (${volatility.toFixed(1)}%) — confianza reducida`, positive: false, weight: 0 });
    } else if (volatility > 1.5) {
      confidence = Math.max(30, confidence - 5);
    }

    if (volume.volumeRatio !== null && volume.volumeRatio < 0.5) {
      // Very low volume = unreliable signal
      confidence = Math.max(25, confidence - 8);
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

      const { previous, next } = getSequentialAdjacentTFs(timeframe);
      const relevantTFs = [previous, next].filter(Boolean);

      adjacentData.signals.forEach(({ timeframe: tfName, data }) => {
        if (data && relevantTFs.includes(tfName as IntradayTimeframe)) {
          const tfEmas = data.emas;
          const tfDirection = getDirectionFromEMAs(tfEmas.ema9, tfEmas.ema21, tfEmas.ema50);
          const tfAlignment = getEMAAlignment(tfEmas.ema9, tfEmas.ema21, tfEmas.ema50);

          // Enhanced confidence: EMA alignment + RSI zone + MACD agreement
          let tfConfidence = 50;
          if (tfAlignment === 'bullish' || tfAlignment === 'bearish') {
            tfConfidence = 60;
          }
          // RSI confirmation from adjacent TF
          if (data.rsi?.current !== null) {
            const adjRsi = data.rsi.current;
            if ((tfDirection === 'LONG' && adjRsi > 50) || (tfDirection === 'SHORT' && adjRsi < 50)) {
              tfConfidence += 10;
            }
          }
          // MACD confirmation from adjacent TF
          if (data.macd?.histogram !== null) {
            if ((tfDirection === 'LONG' && data.macd.histogram > 0) || (tfDirection === 'SHORT' && data.macd.histogram < 0)) {
              tfConfidence += 10;
            }
          }
          // Momentum bonus
          const momentum = Math.abs(data.change24h || 0);
          if (momentum > 2) tfConfidence += 10;
          else if (momentum > 1) tfConfidence += 5;

          adjacentTFSignals.push({
            timeframe: tfName,
            direction: tfDirection,
            confidence: Math.min(95, tfConfidence),
            emaAlignment: tfAlignment
          });

          if (tfName === previous) {
            adjacentSignals = {
              ...adjacentSignals,
              lower: { timeframe: tfName, direction: tfDirection, confidence: tfConfidence }
            };
          } else if (tfName === next) {
            adjacentSignals = {
              ...adjacentSignals,
              upper: { timeframe: tfName, direction: tfDirection, confidence: tfConfidence }
            };
          }
        }
      });

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

    logger.log(`[useIntradaySignal] Signal: ${direction} (${signal.confidence.toFixed(0)}% confidence)`, {
      bullishScore,
      bearishScore,
      netScore,
      rsi: rsi.current?.toFixed(0),
      macdHist: macd.histogram?.toFixed(2),
      volRatio: volume.volumeRatio?.toFixed(1),
      factors: factors.length,
      timeframe,
    });

    return signal;
  }, [intradayData, derivativesData, timeframe, adjacentData]);
}
