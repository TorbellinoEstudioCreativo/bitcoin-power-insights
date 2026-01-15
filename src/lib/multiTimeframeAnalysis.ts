// ============================================================================
// MULTI-TIMEFRAME CONFLUENCE ANALYSIS
// ============================================================================

import { IntradayTimeframe } from '@/hooks/useIntradayData';

export type Direction = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface TimeframeSignal {
  timeframe: IntradayTimeframe;
  direction: Direction;
  confidence: number;
  emaAlignment: 'bullish' | 'bearish' | 'neutral';
}

export interface ConfluenceResult {
  adjustedConfidence: number;
  confluenceScore: number;
  recommendation: string;
  warnings: string[];
}

// ============================================================================
// TIMEFRAME WEIGHTS
// Higher timeframes carry more weight (less noise, more reliable)
// ============================================================================

const TIMEFRAME_WEIGHTS: Record<IntradayTimeframe, number> = {
  '5m': 1.0,   // Most noise
  '15m': 1.5,  // Moderate
  '30m': 2.0,  // Balanced
  '1h': 2.5,   // High reliability
  '4h': 3.0    // Highest reliability
};

const TIMEFRAME_ORDER: IntradayTimeframe[] = ['5m', '15m', '30m', '1h', '4h'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get adjacent timeframes (lower and upper)
 */
export function getAdjacentTimeframes(current: IntradayTimeframe): {
  lower?: IntradayTimeframe;
  upper?: IntradayTimeframe;
} {
  const index = TIMEFRAME_ORDER.indexOf(current);
  
  return {
    lower: index > 0 ? TIMEFRAME_ORDER[index - 1] : undefined,
    upper: index < TIMEFRAME_ORDER.length - 1 ? TIMEFRAME_ORDER[index + 1] : undefined
  };
}

/**
 * Determine direction from EMA values
 */
export function getDirectionFromEMAs(
  ema9: number | null,
  ema21: number | null,
  ema50: number | null
): Direction {
  if (ema9 === null || ema21 === null || ema50 === null) {
    return 'NEUTRAL';
  }
  
  const bullishAlignment = ema9 > ema21 && ema21 > ema50;
  const bearishAlignment = ema9 < ema21 && ema21 < ema50;
  
  if (bullishAlignment) return 'LONG';
  if (bearishAlignment) return 'SHORT';
  return 'NEUTRAL';
}

/**
 * Get EMA alignment type
 */
export function getEMAAlignment(
  ema9: number | null,
  ema21: number | null,
  ema50: number | null
): 'bullish' | 'bearish' | 'neutral' {
  if (ema9 === null || ema21 === null || ema50 === null) {
    return 'neutral';
  }
  
  if (ema9 > ema21 && ema21 > ema50) return 'bullish';
  if (ema9 < ema21 && ema21 < ema50) return 'bearish';
  return 'neutral';
}

// ============================================================================
// CONFLUENCE CALCULATION
// ============================================================================

/**
 * Calculate confluence score and adjusted confidence
 */
function calculateConfluence(
  currentSignal: TimeframeSignal,
  adjacentSignals: TimeframeSignal[]
): {
  confluenceScore: number;
  agreements: number;
  disagreements: number;
  adjustedConfidence: number;
} {
  console.log('[MultiTF] Analyzing confluence for', currentSignal.timeframe);
  
  const { lower, upper } = getAdjacentTimeframes(currentSignal.timeframe);
  
  let agreements = 0;
  let disagreements = 0;
  let weightedAgreement = 0;
  let totalWeight = 0;
  
  adjacentSignals.forEach(signal => {
    const weight = TIMEFRAME_WEIGHTS[signal.timeframe];
    totalWeight += weight;
    
    // Check for agreement (same direction or both neutral/weak)
    const isAgreement = 
      (currentSignal.direction === signal.direction) ||
      (currentSignal.direction === 'NEUTRAL' && signal.confidence < 50) ||
      (signal.direction === 'NEUTRAL' && currentSignal.confidence < 50);
    
    if (isAgreement) {
      agreements++;
      weightedAgreement += weight;
      console.log(`  ✅ ${signal.timeframe} agrees: ${signal.direction} ${signal.confidence.toFixed(0)}%`);
    } else {
      disagreements++;
      console.log(`  ❌ ${signal.timeframe} disagrees: ${signal.direction} ${signal.confidence.toFixed(0)}%`);
    }
  });
  
  // Confluence score = weighted agreement percentage
  const confluenceScore = totalWeight > 0 
    ? (weightedAgreement / totalWeight) * 100 
    : 50;
  
  // Adjust confidence based on adjacent timeframes
  let adjustedConfidence = currentSignal.confidence;
  
  // Upper timeframe disagreement = heavy penalty
  if (upper) {
    const upperSignal = adjacentSignals.find(s => s.timeframe === upper);
    if (upperSignal && 
        upperSignal.direction !== currentSignal.direction && 
        upperSignal.direction !== 'NEUTRAL' &&
        currentSignal.direction !== 'NEUTRAL') {
      const penalty = upperSignal.confidence > 60 ? 25 : 15;
      adjustedConfidence = Math.max(30, adjustedConfidence - penalty);
      console.log(`  ⚠️ Upper TF (${upper}) disagrees: ${upperSignal.direction} - penalty: -${penalty}%`);
    } else if (upperSignal && upperSignal.direction === currentSignal.direction) {
      // Upper agrees = bonus
      const bonus = upperSignal.confidence > 70 ? 10 : 5;
      adjustedConfidence = Math.min(95, adjustedConfidence + bonus);
      console.log(`  ✅ Upper TF (${upper}) agrees - bonus: +${bonus}%`);
    }
  }
  
  // Lower timeframe agreement = slight bonus
  if (lower) {
    const lowerSignal = adjacentSignals.find(s => s.timeframe === lower);
    if (lowerSignal && lowerSignal.direction === currentSignal.direction) {
      const bonus = lowerSignal.confidence > 70 ? 5 : 3;
      adjustedConfidence = Math.min(95, adjustedConfidence + bonus);
      console.log(`  ✅ Lower TF (${lower}) agrees - bonus: +${bonus}%`);
    }
  }
  
  // Full confluence bonus
  if (disagreements === 0 && agreements >= 2) {
    adjustedConfidence = Math.min(95, adjustedConfidence + 5);
    console.log(`  🎯 Full confluence - bonus: +5%`);
  }
  
  console.log(`  📊 Result: ${currentSignal.confidence.toFixed(0)}% → ${adjustedConfidence.toFixed(0)}% (confluence: ${confluenceScore.toFixed(0)}%)`);
  
  return {
    confluenceScore,
    agreements,
    disagreements,
    adjustedConfidence: Math.round(adjustedConfidence)
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate multi-timeframe recommendation based on confluence
 */
export function generateMultiTFRecommendation(
  currentSignal: TimeframeSignal,
  adjacentSignals: TimeframeSignal[]
): ConfluenceResult {
  // If no adjacent signals, return original confidence
  if (adjacentSignals.length === 0) {
    return {
      adjustedConfidence: currentSignal.confidence,
      confluenceScore: 50,
      recommendation: 'Sin datos de otros timeframes',
      warnings: []
    };
  }
  
  const analysis = calculateConfluence(currentSignal, adjacentSignals);
  const { lower, upper } = getAdjacentTimeframes(currentSignal.timeframe);
  
  const warnings: string[] = [];
  let recommendation = '';
  
  // Generate recommendation based on confluence score
  if (analysis.confluenceScore >= 80) {
    recommendation = 'Excelente confluencia - Señal confiable';
  } else if (analysis.confluenceScore >= 60) {
    recommendation = 'Confluencia moderada - Proceder con precaución';
  } else if (analysis.confluenceScore >= 40) {
    recommendation = 'Baja confluencia - Verificar timeframes superiores';
    warnings.push('Señales mixtas en otros timeframes');
  } else {
    recommendation = 'Conflicto entre timeframes - Esperar confirmación';
    warnings.push('Alta divergencia entre timeframes');
  }
  
  // Specific warnings
  if (upper) {
    const upperSignal = adjacentSignals.find(s => s.timeframe === upper);
    if (upperSignal && 
        upperSignal.direction !== currentSignal.direction &&
        upperSignal.direction !== 'NEUTRAL' &&
        currentSignal.direction !== 'NEUTRAL') {
      warnings.push(`TF ${upper} indica ${upperSignal.direction}`);
    }
  }
  
  if (currentSignal.confidence > 75 && analysis.adjustedConfidence < 60) {
    warnings.push('Confianza reducida por divergencia con TFs superiores');
  }
  
  return {
    adjustedConfidence: analysis.adjustedConfidence,
    confluenceScore: analysis.confluenceScore,
    recommendation,
    warnings
  };
}
