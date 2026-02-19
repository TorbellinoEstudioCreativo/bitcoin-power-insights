// ============================================================================
// SCALPING ENGINE — Gate-Based Signal System (Pure Functions)
// Critical + Confirmatory Gate Architecture
// ============================================================================

import type { IntradayData, IntradayCandle } from '@/hooks/useIntradayData';
import type { DerivativesData } from '@/lib/derivatives';

// ============================================================================
// TYPES
// ============================================================================

export interface ScalpingGate {
  name: string;
  pass: boolean;
  reason: string;
  critical: boolean;
}

export interface ScalpingSignal {
  direction: 'LONG' | 'SHORT' | null;
  gates: ScalpingGate[];
  criticalPass: boolean;
  criticalPassed: number;
  criticalTotal: number;
  confirmatoryPassed: number;
  confirmatoryTotal: number;
  confidence: number;
  atr: number;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp1Percent: number;
  tp2Percent: number;
  tp3Percent: number;
  slPercent: number;
  riskReward: number;
  leverage: { suggested: number; max: number };
  timeLimit: string;
  asset: string;
  timeframe: string;
}

// ============================================================================
// ATR CALCULATION (14-period simple average of True Ranges)
// ============================================================================

function calculateATR14(candles: IntradayCandle[]): number {
  if (candles.length < 15) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }

  const recent = trueRanges.slice(-14);
  return recent.reduce((sum, tr) => sum + tr, 0) / recent.length;
}

// ============================================================================
// EMA CROSSOVER DETECTION (last N candles)
// ============================================================================

function detectEMACrossover(
  ema9Values: number[],
  ema21Values: number[],
  lookback: number = 5
): { crossed: boolean; direction: 'LONG' | 'SHORT' | null } {
  if (ema9Values.length < lookback + 1 || ema21Values.length < lookback + 1) {
    return { crossed: false, direction: null };
  }

  const len = ema9Values.length;

  for (let i = 1; i <= lookback; i++) {
    const idx = len - i;
    const prevIdx = idx - 1;

    const curr9 = ema9Values[idx];
    const curr21 = ema21Values[idx];
    const prev9 = ema9Values[prevIdx];
    const prev21 = ema21Values[prevIdx];

    if (isNaN(curr9) || isNaN(curr21) || isNaN(prev9) || isNaN(prev21)) continue;

    // Bullish crossover: EMA9 crosses above EMA21
    if (prev9 <= prev21 && curr9 > curr21) {
      return { crossed: true, direction: 'LONG' };
    }
    // Bearish crossover: EMA9 crosses below EMA21
    if (prev9 >= prev21 && curr9 < curr21) {
      return { crossed: true, direction: 'SHORT' };
    }
  }

  return { crossed: false, direction: null };
}

// ============================================================================
// INDIVIDUAL GATE EVALUATORS
// ============================================================================

// --- CRITICAL GATES (must all pass) ---

function trendGate(
  ema9: number | null,
  ema21: number | null,
  direction: 'LONG' | 'SHORT'
): ScalpingGate {
  if (ema9 === null || ema21 === null) {
    return { name: 'Trend', pass: false, reason: 'EMAs no disponibles', critical: true };
  }
  const isLongTrend = ema9 > ema21;
  const pass = direction === 'LONG' ? isLongTrend : !isLongTrend;
  const reason = pass
    ? `EMA9 ${isLongTrend ? '>' : '<'} EMA21 — tendencia confirma ${direction}`
    : `EMA9 ${isLongTrend ? '>' : '<'} EMA21 — tendencia contradice ${direction}`;
  return { name: 'Trend', pass, reason, critical: true };
}

function emaCrossoverGate(
  ema9Values: number[],
  ema21Values: number[],
  expectedDirection: 'LONG' | 'SHORT'
): ScalpingGate {
  const crossover = detectEMACrossover(ema9Values, ema21Values, 5);
  if (!crossover.crossed) {
    return { name: 'EMA Cross', pass: false, reason: 'Sin cruce EMA9/21 en las últimas 5 velas', critical: true };
  }
  const pass = crossover.direction === expectedDirection;
  const reason = pass
    ? `Cruce EMA9/21 ${crossover.direction} detectado — trigger válido`
    : `Cruce EMA9/21 ${crossover.direction} contradice dirección ${expectedDirection}`;
  return { name: 'EMA Cross', pass, reason, critical: true };
}

function volumeGate(volumeRatio: number | null): ScalpingGate {
  if (volumeRatio === null) {
    return { name: 'Volume', pass: false, reason: 'Sin datos de volumen', critical: true };
  }
  const pass = volumeRatio > 0.8;
  const reason = pass
    ? `Vol ratio ${volumeRatio.toFixed(2)}x — volumen suficiente`
    : `Vol ratio ${volumeRatio.toFixed(2)}x < 0.8 — volumen bajo, posible trampa`;
  return { name: 'Volume', pass, reason, critical: true };
}

function higherTFGate(
  higherTFData: IntradayData | null | undefined,
  direction: 'LONG' | 'SHORT'
): ScalpingGate {
  if (!higherTFData) {
    return { name: 'Higher TF', pass: false, reason: 'Datos del TF superior no disponibles', critical: true };
  }
  const { ema9, ema21 } = higherTFData.emas;
  if (ema9 === null || ema21 === null) {
    return { name: 'Higher TF', pass: false, reason: 'EMAs del TF superior no disponibles', critical: true };
  }
  const higherBullish = ema9 > ema21;
  const pass = direction === 'LONG' ? higherBullish : !higherBullish;
  const reason = pass
    ? `TF superior: EMA9 ${higherBullish ? '>' : '<'} EMA21 — confirma ${direction}`
    : `TF superior: EMA9 ${higherBullish ? '>' : '<'} EMA21 — contradice ${direction}`;
  return { name: 'Higher TF', pass, reason, critical: true };
}

// --- CONFIRMATORY GATES (add confidence, don't block) ---

function rsiGate(
  rsi: number | null,
  direction: 'LONG' | 'SHORT'
): ScalpingGate {
  if (rsi === null) {
    return { name: 'RSI', pass: false, reason: 'RSI no disponible', critical: false };
  }
  let pass: boolean;
  let range: string;
  if (direction === 'LONG') {
    pass = rsi >= 40 && rsi <= 70;
    range = '40-70';
  } else {
    pass = rsi >= 30 && rsi <= 60;
    range = '30-60';
  }
  const reason = pass
    ? `RSI ${rsi.toFixed(1)} en rango ${range} — momentum adecuado para ${direction}`
    : `RSI ${rsi.toFixed(1)} fuera de rango ${range} — extremo, evitar entrada`;
  return { name: 'RSI', pass, reason, critical: false };
}

function macdGate(
  histogram: number | null,
  direction: 'LONG' | 'SHORT'
): ScalpingGate {
  if (histogram === null) {
    return { name: 'MACD', pass: false, reason: 'MACD no disponible', critical: false };
  }
  const pass = direction === 'LONG' ? histogram > 0 : histogram < 0;
  const reason = pass
    ? `MACD hist ${histogram.toFixed(4)} — confirma dirección ${direction}`
    : `MACD hist ${histogram.toFixed(4)} — contradice dirección ${direction}`;
  return { name: 'MACD', pass, reason, critical: false };
}

function volatilityGate(atrPercent: number): ScalpingGate {
  const pass = atrPercent >= 0.05 && atrPercent <= 2.5;
  let reason: string;
  if (atrPercent < 0.05) {
    reason = `Volatilidad muy baja (${atrPercent.toFixed(3)}%) — sin movimiento`;
  } else if (atrPercent > 2.5) {
    reason = `Volatilidad extrema (${atrPercent.toFixed(2)}%) — impredecible`;
  } else {
    reason = `ATR ${atrPercent.toFixed(3)}% — rango óptimo`;
  }
  return { name: 'Volatility', pass, reason, critical: false };
}

function fundingGate(fundingRatePercent: number | undefined): ScalpingGate {
  if (fundingRatePercent === undefined) {
    return { name: 'Funding', pass: true, reason: 'Sin datos de funding — se asume neutral', critical: false };
  }
  const absFunding = Math.abs(fundingRatePercent);
  const pass = absFunding < 0.05;
  const reason = pass
    ? `Funding ${fundingRatePercent.toFixed(4)}% — neutral, sin riesgo de squeeze`
    : `Funding ${fundingRatePercent.toFixed(4)}% — extremo, riesgo de squeeze`;
  return { name: 'Funding', pass, reason, critical: false };
}

// ============================================================================
// LEVEL CALCULATION
// ============================================================================

export function calculateScalpingLevels(
  price: number,
  direction: 'LONG' | 'SHORT',
  atr: number
): { sl: number; tp1: number; tp2: number; tp3: number; slPercent: number; tp1Percent: number; tp2Percent: number; tp3Percent: number } {
  const slDist = atr * 1;
  const tp1Dist = atr * 1;
  const tp2Dist = atr * 2;
  const tp3Dist = atr * 3;

  const slPercent = (slDist / price) * 100;
  const tp1Percent = (tp1Dist / price) * 100;
  const tp2Percent = (tp2Dist / price) * 100;
  const tp3Percent = (tp3Dist / price) * 100;

  if (direction === 'LONG') {
    return {
      sl: Math.round((price - slDist) * 100) / 100,
      tp1: Math.round((price + tp1Dist) * 100) / 100,
      tp2: Math.round((price + tp2Dist) * 100) / 100,
      tp3: Math.round((price + tp3Dist) * 100) / 100,
      slPercent, tp1Percent, tp2Percent, tp3Percent,
    };
  } else {
    return {
      sl: Math.round((price + slDist) * 100) / 100,
      tp1: Math.round((price - tp1Dist) * 100) / 100,
      tp2: Math.round((price - tp2Dist) * 100) / 100,
      tp3: Math.round((price - tp3Dist) * 100) / 100,
      slPercent, tp1Percent, tp2Percent, tp3Percent,
    };
  }
}

// ============================================================================
// LEVERAGE SUGGESTION
// ============================================================================

export function suggestLeverage(
  criticalPassed: number,
  criticalTotal: number,
  confirmatoryPassed: number,
  confirmatoryTotal: number,
  atrPercent: number
): { suggested: number; max: number } {
  // Base leverage inversely proportional to volatility
  let baseLeverage: number;
  if (atrPercent < 0.1) baseLeverage = 50;
  else if (atrPercent < 0.3) baseLeverage = 40;
  else if (atrPercent < 0.5) baseLeverage = 35;
  else if (atrPercent < 1.0) baseLeverage = 30;
  else if (atrPercent < 1.5) baseLeverage = 25;
  else baseLeverage = 20;

  // Scale: critical gates are mandatory, confirmatory add bonus
  const criticalRatio = criticalTotal > 0 ? criticalPassed / criticalTotal : 0;
  const confirmatoryRatio = confirmatoryTotal > 0 ? confirmatoryPassed / confirmatoryTotal : 0;
  const combinedRatio = criticalRatio * 0.7 + confirmatoryRatio * 0.3;

  const suggested = Math.round(baseLeverage * combinedRatio);
  const max = Math.min(50, Math.round(baseLeverage * 1.2));

  return {
    suggested: Math.max(20, Math.min(50, suggested)),
    max: Math.max(suggested, Math.min(50, max)),
  };
}

// ============================================================================
// TIME LIMIT
// ============================================================================

function getTimeLimit(timeframe: string): string {
  switch (timeframe) {
    case '1m': return '5-15 min';
    case '5m': return '15-30 min';
    default: return '30-60 min';
  }
}

// ============================================================================
// MAIN GATE EVALUATION
// ============================================================================

export function evaluateScalpingGates(
  data: IntradayData,
  derivativesData: DerivativesData | null | undefined,
  higherTFData: IntradayData | null | undefined,
  asset: string,
  timeframe: string
): ScalpingSignal {
  const atr = calculateATR14(data.candles);
  const atrPercent = data.currentPrice > 0 ? (atr / data.currentPrice) * 100 : 0;

  // Determine direction from EMA crossover (now with lookback=5)
  const crossover = detectEMACrossover(
    data.emas.ema9Values,
    data.emas.ema21Values,
    5
  );

  // Fallback direction from current EMA relationship
  let direction: 'LONG' | 'SHORT' | null = crossover.direction;
  if (!direction && data.emas.ema9 !== null && data.emas.ema21 !== null) {
    direction = data.emas.ema9 > data.emas.ema21 ? 'LONG' : 'SHORT';
  }

  // If we can't determine direction at all, return empty signal
  if (!direction) {
    const noDirectionGates: ScalpingGate[] = [
      // Critical gates
      { name: 'Trend', pass: false, reason: 'No se puede determinar dirección', critical: true },
      { name: 'EMA Cross', pass: false, reason: 'Sin cruce detectado', critical: true },
      volumeGate(data.volume.volumeRatio),
      higherTFGate(higherTFData, 'LONG'),
      // Confirmatory gates
      { name: 'RSI', pass: false, reason: 'Requiere dirección', critical: false },
      { name: 'MACD', pass: false, reason: 'Requiere dirección', critical: false },
      volatilityGate(atrPercent),
      fundingGate(derivativesData?.fundingRate?.fundingRatePercent),
    ];
    return {
      direction: null,
      gates: noDirectionGates,
      criticalPass: false,
      criticalPassed: noDirectionGates.filter(g => g.critical && g.pass).length,
      criticalTotal: 4,
      confirmatoryPassed: noDirectionGates.filter(g => !g.critical && g.pass).length,
      confirmatoryTotal: 4,
      confidence: 0,
      atr,
      entry: data.currentPrice,
      sl: 0, tp1: 0, tp2: 0, tp3: 0,
      slPercent: 0, tp1Percent: 0, tp2Percent: 0, tp3Percent: 0,
      riskReward: 0,
      leverage: { suggested: 20, max: 20 },
      timeLimit: getTimeLimit(timeframe),
      asset,
      timeframe,
    };
  }

  // Evaluate all 8 gates — Critical first, then Confirmatory
  const gates: ScalpingGate[] = [
    // Critical (4) — all must pass for signal
    trendGate(data.emas.ema9, data.emas.ema21, direction),
    emaCrossoverGate(data.emas.ema9Values, data.emas.ema21Values, direction),
    volumeGate(data.volume.volumeRatio),
    higherTFGate(higherTFData, direction),
    // Confirmatory (4) — add confidence
    rsiGate(data.rsi.current, direction),
    macdGate(data.macd.histogram, direction),
    volatilityGate(atrPercent),
    fundingGate(derivativesData?.fundingRate?.fundingRatePercent),
  ];

  const criticalGates = gates.filter(g => g.critical);
  const confirmatoryGates = gates.filter(g => !g.critical);
  const criticalPassed = criticalGates.filter(g => g.pass).length;
  const criticalTotal = criticalGates.length;
  const confirmatoryPassed = confirmatoryGates.filter(g => g.pass).length;
  const confirmatoryTotal = confirmatoryGates.length;
  const criticalPass = criticalPassed === criticalTotal;

  // Confidence: base 65% when all critical pass + 8% per confirmatory (max ~97%)
  let confidence: number;
  if (criticalPass) {
    confidence = 65 + confirmatoryPassed * 8;
  } else {
    confidence = Math.round((criticalPassed / criticalTotal) * 40);
  }

  // Calculate levels
  const levels = calculateScalpingLevels(data.currentPrice, direction, atr);
  const riskReward = levels.slPercent > 0 ? levels.tp2Percent / levels.slPercent : 0;

  const leverage = suggestLeverage(criticalPassed, criticalTotal, confirmatoryPassed, confirmatoryTotal, atrPercent);

  return {
    direction,
    gates,
    criticalPass,
    criticalPassed,
    criticalTotal,
    confirmatoryPassed,
    confirmatoryTotal,
    confidence: Math.min(100, confidence),
    atr,
    entry: data.currentPrice,
    ...levels,
    riskReward: Math.round(riskReward * 100) / 100,
    leverage,
    timeLimit: getTimeLimit(timeframe),
    asset,
    timeframe,
  };
}
