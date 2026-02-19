// ============================================================================
// CALCULO DE TPS AJUSTADOS AL TIMEFRAME
// ============================================================================

import { IntradayTimeframe } from '@/hooks/useIntradayData';
import { logger } from '@/lib/logger';

export interface TimeframeTPs {
  tp1Percent: number;
  tp2Percent: number;
  tp3Percent: number;
  expectedDuration: string;
  stopLossPercent: number;
}

/**
 * Configuración de TPs por timeframe
 * Basado en movimientos típicos por período
 */
export const TIMEFRAME_TP_CONFIG: Record<IntradayTimeframe, TimeframeTPs> = {
  '1m': {
    tp1Percent: 0.15,      // 0.15% - Scalping rápido
    tp2Percent: 0.3,
    tp3Percent: 0.5,
    stopLossPercent: 0.2,
    expectedDuration: '5-15 min'
  },
  '5m': {
    tp1Percent: 0.3,      // 0.3% - Alcanzable en 15-30 min
    tp2Percent: 0.6,      // 0.6% - Alcanzable en 30-45 min
    tp3Percent: 1.0,      // 1.0% - Alcanzable en 45-60 min
    stopLossPercent: 0.5, // SL más ajustado
    expectedDuration: '30-60 min'
  },
  '15m': {
    tp1Percent: 0.5,      // 0.5% - Alcanzable en 30-45 min
    tp2Percent: 1.0,      // 1.0% - Alcanzable en 1-1.5 horas
    tp3Percent: 1.5,      // 1.5% - Alcanzable en 1.5-2 horas
    stopLossPercent: 0.8,
    expectedDuration: '1-2 horas'
  },
  '1h': {
    tp1Percent: 1.0,      // 1.0% - Alcanzable en 2 horas
    tp2Percent: 2.0,      // 2.0% - Alcanzable en 4 horas
    tp3Percent: 3.0,      // 3.0% - Alcanzable en 6 horas
    stopLossPercent: 1.5,
    expectedDuration: '4-6 horas'
  },
  '4h': {
    tp1Percent: 1.5,      // 1.5% - Alcanzable en 8 horas
    tp2Percent: 3.0,      // 3.0% - Alcanzable en 12 horas
    tp3Percent: 5.0,      // 5.0% - Alcanzable en 16-24 horas
    stopLossPercent: 2.5,
    expectedDuration: '8-24 horas'
  },
  '1d': {
    tp1Percent: 2.5,      // 2.5% - Alcanzable en 1-2 días
    tp2Percent: 5.0,      // 5.0% - Alcanzable en 2-3 días
    tp3Percent: 8.0,      // 8.0% - Alcanzable en 3-5 días
    stopLossPercent: 3.5,
    expectedDuration: '2-5 días'
  }
};

/**
 * Interfaz para datos de velas OHLC
 */
export interface CandleData {
  high: number;
  low: number;
  close: number;
}

/**
 * Calcular ATR (Average True Range) para medir volatilidad
 */
function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

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

  // Promedio de los últimos 'period' valores
  const recentTRs = trueRanges.slice(-period);
  const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / period;

  return atr;
}

/**
 * Resultado del cálculo de TPs intradía
 */
export interface IntradayTPLevels {
  tp1: number;
  tp2: number;
  tp3: number;
  stopLoss: number;
  tp1Percent: number;
  tp2Percent: number;
  tp3Percent: number;
  stopLossPercent: number;
  expectedDuration: string;
  basedOnATR: boolean;
  riskRewardRatio: number;
}

/**
 * Calcular TPs ajustados al timeframe con ATR opcional
 */
export function calculateIntradayTPs(
  entryPrice: number,
  direction: 'LONG' | 'SHORT' | 'NEUTRAL',
  timeframe: IntradayTimeframe,
  candles?: CandleData[]
): IntradayTPLevels {
  logger.log(`[IntradayTPs] Calculating for ${timeframe} ${direction}...`);

  const config = TIMEFRAME_TP_CONFIG[timeframe];

  // Si tenemos candles, ajustar con ATR
  let tp1Percent = config.tp1Percent;
  let tp2Percent = config.tp2Percent;
  let tp3Percent = config.tp3Percent;
  let slPercent = config.stopLossPercent;
  let basedOnATR = false;

  if (candles && candles.length > 14) {
    const atr = calculateATR(candles);
    const atrPercent = (atr / entryPrice) * 100;

    logger.log(`[IntradayTPs] ATR: ${atr.toFixed(2)} (${atrPercent.toFixed(3)}%)`);

    // Ajustar TPs basados en ATR solo si es significativo
    if (atrPercent > 0.1) {
      tp1Percent = Math.max(config.tp1Percent, atrPercent * 1.0);
      tp2Percent = Math.max(config.tp2Percent, atrPercent * 2.0);
      tp3Percent = Math.max(config.tp3Percent, atrPercent * 3.0);
      slPercent = Math.max(config.stopLossPercent, atrPercent * 1.5);
      basedOnATR = true;
    }
  }

  // Calcular precios según dirección
  let tp1: number, tp2: number, tp3: number, stopLoss: number;

  if (direction === 'LONG') {
    tp1 = entryPrice * (1 + tp1Percent / 100);
    tp2 = entryPrice * (1 + tp2Percent / 100);
    tp3 = entryPrice * (1 + tp3Percent / 100);
    stopLoss = entryPrice * (1 - slPercent / 100);
  } else if (direction === 'SHORT') {
    tp1 = entryPrice * (1 - tp1Percent / 100);
    tp2 = entryPrice * (1 - tp2Percent / 100);
    tp3 = entryPrice * (1 - tp3Percent / 100);
    stopLoss = entryPrice * (1 + slPercent / 100);
  } else {
    // NEUTRAL - valores por defecto
    tp1 = entryPrice * 1.005;
    tp2 = entryPrice * 1.01;
    tp3 = entryPrice * 1.015;
    stopLoss = entryPrice * 0.99;
  }

  // Calcular R:R basado en TP2 (objetivo principal)
  const riskRewardRatio = tp2Percent / slPercent;

  return {
    tp1: Math.round(tp1 * 100) / 100,
    tp2: Math.round(tp2 * 100) / 100,
    tp3: Math.round(tp3 * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    tp1Percent,
    tp2Percent,
    tp3Percent,
    stopLossPercent: slPercent,
    expectedDuration: config.expectedDuration,
    basedOnATR,
    riskRewardRatio
  };
}

/**
 * Validar que TPs sean alcanzables en el gráfico reciente
 */
export function validateTPsAgainstRange(
  tps: IntradayTPLevels,
  candles: CandleData[],
  direction: 'LONG' | 'SHORT'
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (candles.length < 20) {
    return { valid: true, warnings: [] };
  }

  // Obtener rango de las últimas 20 velas
  const recent = candles.slice(-20);
  const highestHigh = Math.max(...recent.map(c => c.high));
  const lowestLow = Math.min(...recent.map(c => c.low));

  if (direction === 'LONG') {
    if (tps.tp1 > highestHigh) {
      warnings.push('TP1 está por encima del máximo reciente');
    }
    if (tps.tp2 > highestHigh * 1.02) {
      warnings.push('TP2 puede ser muy ambicioso');
    }
    if (tps.tp3 > highestHigh * 1.05) {
      warnings.push('TP3 probablemente inalcanzable en este timeframe');
    }
  } else {
    if (tps.tp1 < lowestLow) {
      warnings.push('TP1 está por debajo del mínimo reciente');
    }
    if (tps.tp2 < lowestLow * 0.98) {
      warnings.push('TP2 puede ser muy ambicioso');
    }
    if (tps.tp3 < lowestLow * 0.95) {
      warnings.push('TP3 probablemente inalcanzable en este timeframe');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}
