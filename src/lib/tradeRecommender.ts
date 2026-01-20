import type { IntradayAsset, IntradayTimeframe } from '@/hooks/useIntradayData';

// ============================================================================
// TYPES
// ============================================================================

export interface SignalScore {
  asset: IntradayAsset;
  timeframe: IntradayTimeframe;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  confluenceScore: number;
  totalScore: number;
  rank: number;
}

export interface LeverageRecommendation {
  min: number;
  max: number;
  suggested: number;
  reason: string;
  warnings: string[];
}

export interface TradeSetup {
  signal: SignalScore;
  leverage: LeverageRecommendation;
  entry: number;
  stopLoss: {
    price: number;
    distancePercent: number;
  };
  takeProfits: Array<{
    level: number;
    price: number;
    distancePercent: number;
    exitPercent: number;
  }>;
  riskReward: number;
  estimatedDuration: string;
}

// ============================================================================
// SCORING SYSTEM
// ============================================================================

/**
 * Calculate total score for a signal
 * Weights: confidence (50%), confluence (30%), volatility (10%), OI (10%)
 */
export function calculateTotalScore(
  confidence: number,
  confluenceScore: number,
  volatility: number,
  oiChange: number
): number {
  // Validate and sanitize inputs
  const safeConfidence = Math.max(0, Math.min(100, confidence || 0));
  const safeConfluence = Math.max(0, Math.min(100, confluenceScore || 0));
  const safeVolatility = Math.max(0, Math.min(100, volatility ?? 50));
  const safeOiChange = oiChange ?? 0;

  const confidenceWeight = 0.5;
  const confluenceWeight = 0.3;
  const volatilityWeight = 0.1;
  const oiWeight = 0.1;
  
  // Moderate volatility is optimal (50 = perfect)
  const volatilityScore = 100 - Math.abs(safeVolatility - 50);
  
  // Growing OI is positive
  const oiScore = Math.max(0, Math.min(100, 50 + safeOiChange * 5));
  
  const totalScore = 
    (safeConfidence * confidenceWeight) +
    (safeConfluence * confluenceWeight) +
    (volatilityScore * volatilityWeight) +
    (oiScore * oiWeight);
  
  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

/**
 * Rank signals and return top 3
 */
export function rankSignals(
  allSignals: Array<{
    asset: IntradayAsset;
    timeframe: IntradayTimeframe;
    direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    confidence: number;
    confluenceScore: number;
    volatility: number;
    oiChange: number;
  }>
): SignalScore[] {
  const scored: SignalScore[] = [];
  
  allSignals.forEach(signal => {
    // Skip neutral signals
    if (signal.direction === 'NEUTRAL') return;
    
    const totalScore = calculateTotalScore(
      signal.confidence,
      signal.confluenceScore,
      signal.volatility,
      signal.oiChange
    );
    
    scored.push({
      asset: signal.asset,
      timeframe: signal.timeframe,
      direction: signal.direction,
      confidence: signal.confidence,
      confluenceScore: signal.confluenceScore,
      totalScore,
      rank: 0
    });
  });
  
  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);
  
  // Assign ranks
  scored.forEach((s, i) => s.rank = i + 1);
  
  return scored.slice(0, 3);
}

// ============================================================================
// LEVERAGE CALCULATION
// ============================================================================

/**
 * Calculate suggested leverage based on timeframe and conditions
 */
export function calculateLeverage(
  timeframe: IntradayTimeframe,
  confidence: number,
  confluenceScore: number,
  volatility: number,
  oiChange: number
): LeverageRecommendation {
  // Base leverage ranges per timeframe
  const BASE_LEVERAGE: Record<IntradayTimeframe, { min: number; max: number }> = {
    '1m':  { min: 40, max: 75 },  // Ultra scalping
    '5m':  { min: 30, max: 50 },  // Fast scalping
    '15m': { min: 20, max: 40 },  // Medium scalping
    '1h':  { min: 10, max: 25 },  // Intraday
    '4h':  { min: 5,  max: 15 },  // Medium swing
    '1d':  { min: 2,  max: 8 }    // Long swing
  };
  
  const { min, max } = BASE_LEVERAGE[timeframe];
  
  // Initial factor (0-1)
  let factor = 0.5;
  
  // Adjust by confidence
  if (confidence > 90) factor += 0.3;
  else if (confidence > 75) factor += 0.1;
  else if (confidence < 60) factor -= 0.2;
  
  // Adjust by confluence
  if (confluenceScore > 85) factor += 0.2;
  else if (confluenceScore < 50) factor -= 0.3;
  
  // Adjust by volatility
  if (volatility > 70) factor -= 0.2;
  else if (volatility < 30) factor -= 0.1;
  
  // Adjust by OI
  if (Math.abs(oiChange) < 1) factor -= 0.1;
  
  // Clamp factor
  factor = Math.max(0, Math.min(1, factor));
  const suggested = Math.round(min + (max - min) * factor);
  
  // Build warnings
  const warnings: string[] = [];
  if (confidence < 70) warnings.push('Confianza moderada');
  if (confluenceScore < 60) warnings.push('Baja confluencia multi-TF');
  if (volatility > 70) warnings.push('Alta volatilidad');
  if (Math.abs(oiChange) < 1) warnings.push('OI estable - posible lateralización');
  
  // Build reason
  let reason = `Basado en ${timeframe}`;
  if (factor > 0.7) reason += ' con señal fuerte';
  else if (factor < 0.3) reason += ' con condiciones moderadas';
  
  return { min, max, suggested, reason, warnings };
}

// ============================================================================
// TRADE SETUP GENERATION
// ============================================================================

/**
 * Generate complete trade setup
 * Returns null if inputs are invalid
 */
export function generateTradeSetup(
  signal: SignalScore,
  currentPrice: number,
  slPrice: number,
  tpPrices: number[],
  volatility: number,
  oiChange: number
): TradeSetup | null {
  // Validate critical inputs
  if (!currentPrice || currentPrice <= 0) {
    console.warn('[TradeSetup] Invalid current price:', currentPrice);
    return null;
  }
  
  if (!slPrice || slPrice <= 0) {
    console.warn('[TradeSetup] Invalid SL price:', slPrice);
    return null;
  }
  
  if (!tpPrices || tpPrices.length === 0) {
    console.warn('[TradeSetup] No TP prices provided');
    return null;
  }
  
  // Filter out invalid TP prices
  const validTPs = tpPrices.filter(p => p > 0);
  if (validTPs.length === 0) {
    console.warn('[TradeSetup] All TP prices invalid');
    return null;
  }

  const leverage = calculateLeverage(
    signal.timeframe,
    signal.confidence,
    signal.confluenceScore,
    volatility ?? 50,
    oiChange ?? 0
  );
  
  const slDistance = Math.abs((currentPrice - slPrice) / currentPrice) * 100;
  
  // Protect against division by zero
  if (slDistance === 0) {
    console.warn('[TradeSetup] SL distance is zero');
    return null;
  }
  
  const takeProfits = validTPs.map((price, i) => ({
    level: i + 1,
    price,
    distancePercent: Math.abs((price - currentPrice) / currentPrice) * 100,
    exitPercent: i === 0 ? 40 : i === 1 ? 30 : 30
  }));
  
  // Calculate average TP distance for R:R
  const avgTpDistance = takeProfits.reduce((sum, tp) => sum + tp.distancePercent, 0) / takeProfits.length;
  const riskReward = avgTpDistance / slDistance;
  
  const DURATIONS: Record<IntradayTimeframe, string> = {
    '1m': '5-15 minutos',
    '5m': '30-60 minutos',
    '15m': '1-2 horas',
    '1h': '4-8 horas',
    '4h': '12-24 horas',
    '1d': '3-7 días'
  };
  
  return {
    signal,
    leverage,
    entry: currentPrice,
    stopLoss: {
      price: slPrice,
      distancePercent: slDistance
    },
    takeProfits,
    riskReward,
    estimatedDuration: DURATIONS[signal.timeframe]
  };
}
