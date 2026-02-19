// ============================================================================
// UNIFIED SIGNAL ENGINE
// Single source of truth for signal direction + confidence calculation.
// Used by both useIntradaySignal (main view) and useAllSignals (ranking panel).
// ============================================================================

import { IntradayData, IntradayTimeframe } from '@/hooks/useIntradayData';
import { DerivativesData } from '@/lib/derivatives';

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface SignalFactor {
  label: string;
  positive: boolean;
  weight: number;
}

export interface SignalResult {
  direction: SignalDirection;
  confidence: number;
  factors: SignalFactor[];
  bullishScore: number;
  bearishScore: number;
}

// Derivatives weight scales by timeframe — funding/OI move slowly
const DERIVATIVES_WEIGHT_SCALE: Record<IntradayTimeframe, number> = {
  '1m': 0.3,
  '5m': 0.5,
  '15m': 0.7,
  '1h': 0.85,
  '4h': 1.0,
  '1d': 1.0,
};

/**
 * Core signal calculation — pure function, no hooks.
 * Produces the same result regardless of where it's called.
 */
export function calculateSignal(
  data: IntradayData,
  derivativesData: DerivativesData | null | undefined,
  timeframe: IntradayTimeframe
): SignalResult {
  const { currentPrice, emas, rsi, macd, volume, change24h, volatility } = data;
  const factors: SignalFactor[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // =========================================================================
  // FACTOR 1: EMA Trend Structure + Crossover (Weight: 20)
  // =========================================================================
  if (emas.ema9 !== null && emas.ema21 !== null && emas.ema50 !== null) {
    const perfectBullish = emas.ema9 > emas.ema21 && emas.ema21 > emas.ema50;
    const perfectBearish = emas.ema9 < emas.ema21 && emas.ema21 < emas.ema50;

    let recentCrossover: 'bullish' | 'bearish' | null = null;
    const ema9Vals = emas.ema9Values;
    const ema21Vals = emas.ema21Values;

    if (ema9Vals.length >= 3 && ema21Vals.length >= 3) {
      const len = ema9Vals.length;
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
  // =========================================================================
  if (rsi.current !== null) {
    const rsiVal = rsi.current;

    if (rsiVal > 70) {
      if (rsi.previous !== null && rsi.current < rsi.previous) {
        factors.push({ label: `RSI sobrecomprado y cayendo (${rsiVal.toFixed(0)})`, positive: false, weight: 20 });
        bearishScore += 20;
      } else {
        factors.push({ label: `RSI sobrecomprado (${rsiVal.toFixed(0)})`, positive: false, weight: 15 });
        bearishScore += 15;
      }
    } else if (rsiVal < 30) {
      if (rsi.previous !== null && rsi.current > rsi.previous) {
        factors.push({ label: `RSI sobrevendido y recuperando (${rsiVal.toFixed(0)})`, positive: true, weight: 20 });
        bullishScore += 20;
      } else {
        factors.push({ label: `RSI sobrevendido (${rsiVal.toFixed(0)})`, positive: true, weight: 15 });
        bullishScore += 15;
      }
    } else if (rsiVal >= 50 && rsiVal <= 70) {
      factors.push({ label: `RSI en zona alcista (${rsiVal.toFixed(0)})`, positive: true, weight: 10 });
      bullishScore += 10;
    } else if (rsiVal >= 30 && rsiVal < 50) {
      factors.push({ label: `RSI en zona bajista (${rsiVal.toFixed(0)})`, positive: false, weight: 10 });
      bearishScore += 10;
    }
  }

  // =========================================================================
  // FACTOR 3: MACD Signal (Weight: 20)
  // =========================================================================
  if (macd.macd !== null && macd.signal !== null && macd.histogram !== null) {
    const hist = macd.histogram;
    const prevHist = macd.previousHistogram;
    const macdAboveSignal = macd.macd > macd.signal;

    const histogramFlipBullish = prevHist !== null && prevHist < 0 && hist > 0;
    const histogramFlipBearish = prevHist !== null && prevHist > 0 && hist < 0;

    if (histogramFlipBullish) {
      factors.push({ label: 'MACD histograma gira positivo (señal de compra)', positive: true, weight: 20 });
      bullishScore += 20;
    } else if (histogramFlipBearish) {
      factors.push({ label: 'MACD histograma gira negativo (señal de venta)', positive: false, weight: 20 });
      bearishScore += 20;
    } else if (macdAboveSignal && hist > 0) {
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
  // =========================================================================
  if (volume.volumeRatio !== null) {
    const vr = volume.volumeRatio;
    const obvRising = volume.obv !== null && volume.obvPrevious !== null && volume.obv > volume.obvPrevious;
    const obvFalling = volume.obv !== null && volume.obvPrevious !== null && volume.obv < volume.obvPrevious;

    if (vr > 1.5) {
      if (change24h > 0 && obvRising) {
        factors.push({ label: `Volumen alto (${vr.toFixed(1)}x) + OBV subiendo`, positive: true, weight: 15 });
        bullishScore += 15;
      } else if (change24h < 0 && obvFalling) {
        factors.push({ label: `Volumen alto (${vr.toFixed(1)}x) + OBV cayendo`, positive: false, weight: 15 });
        bearishScore += 15;
      } else {
        factors.push({ label: `Volumen alto (${vr.toFixed(1)}x) sin dirección clara`, positive: false, weight: 5 });
      }
    } else if (vr > 0.8) {
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
      factors.push({ label: `Volumen bajo (${vr.toFixed(1)}x) — movimiento poco confiable`, positive: false, weight: 5 });
    }
  }

  // =========================================================================
  // FACTOR 5: Price Action vs EMAs (Weight: 10)
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
      factors.push({ label: 'Precio entre EMA9 y EMA21 (indecisión)', positive: false, weight: 3 });
    }
  }

  // =========================================================================
  // FACTOR 6: Derivatives (Funding Rate + Open Interest) (Weight: 15 scaled)
  // =========================================================================
  const derivScale = DERIVATIVES_WEIGHT_SCALE[timeframe];
  if (derivativesData) {
    const { fundingRate, openInterest } = derivativesData;
    const fundingPercent = fundingRate.fundingRatePercent;

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
  // DIRECTION + CONFIDENCE
  // =========================================================================
  const netScore = bullishScore - bearishScore;

  let direction: SignalDirection;
  let confidence: number;

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
  // =========================================================================
  if (volatility > 2.5) {
    confidence = Math.max(30, confidence - 10);
    factors.push({ label: `Volatilidad extrema (${volatility.toFixed(1)}%) — confianza reducida`, positive: false, weight: 0 });
  } else if (volatility > 1.5) {
    confidence = Math.max(30, confidence - 5);
  }

  if (volume.volumeRatio !== null && volume.volumeRatio < 0.5) {
    confidence = Math.max(25, confidence - 8);
  }

  return { direction, confidence, factors, bullishScore, bearishScore };
}
