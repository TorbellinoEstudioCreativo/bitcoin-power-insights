// ============================================================================
// MULTI-TIMEFRAME CONFLUENCE ANALYSIS
// ============================================================================

import { IntradayTimeframe, AllTimeframes } from '@/hooks/useIntradayData';

export type Direction = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface TimeframeSignal {
  timeframe: AllTimeframes;
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

const TIMEFRAME_WEIGHTS: Record<AllTimeframes, number> = {
  '1m': 0.5,   // Most noise
  '5m': 1.0,
  '15m': 1.5,
  '1h': 2.0,
  '4h': 2.5,
  '1d': 3.0,
  '1w': 3.5    // Highest reliability
};

// ============================================================================
// CONFLUENCE MATRIX
// Each timeframe validates with specific TFs (not necessarily adjacent)
// ============================================================================

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const CONFLUENCE_MATRIX: Record<Timeframe, {
  lower: AllTimeframes[];
  upper: AllTimeframes[];
}> = {
  '1m': {
    lower: [],
    upper: ['5m', '1h']
  },
  '5m': {
    lower: ['1m'],
    upper: ['1h']
  },
  '15m': {
    lower: ['5m'],
    upper: ['1h']
  },
  '1h': {
    lower: ['15m'],
    upper: ['4h']
  },
  '4h': {
    lower: ['1h'],
    upper: ['1d']
  },
  '1d': {
    lower: ['4h'],
    upper: ['1w']
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get validation timeframes from the confluence matrix
 */
export function getValidationTimeframes(current: IntradayTimeframe): {
  lower: AllTimeframes[];
  upper: AllTimeframes[];
} {
  return CONFLUENCE_MATRIX[current as Timeframe] ?? { lower: [], upper: [] };
}

/**
 * @deprecated Use getValidationTimeframes instead
 * Get adjacent timeframes (legacy compatibility)
 */
export function getAdjacentTimeframes(current: IntradayTimeframe): {
  lower?: IntradayTimeframe;
  upper?: IntradayTimeframe;
} {
  const validation = getValidationTimeframes(current);
  
  // Return first lower and first upper that are visible (not 1w)
  const lower = validation.lower.find(tf => tf !== '1w') as IntradayTimeframe | undefined;
  const upper = validation.upper.find(tf => tf !== '1w') as IntradayTimeframe | undefined;
  
  return { lower, upper };
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
  
  const validation = getValidationTimeframes(currentSignal.timeframe as IntradayTimeframe);
  
  let agreements = 0;
  let disagreements = 0;
  let weightedAgreement = 0;
  let totalWeight = 0;
  
  adjacentSignals.forEach(signal => {
    const weight = TIMEFRAME_WEIGHTS[signal.timeframe];
    totalWeight += weight;
    
    // Check for agreement - NEUTRAL only counts as agreement if current signal is weak (<60%)
    const isAgreement = 
      (currentSignal.direction === signal.direction) ||
      (currentSignal.direction === 'NEUTRAL' && signal.confidence < 50) ||
      (signal.direction === 'NEUTRAL' && currentSignal.confidence < 60);
    
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
  
  // Adjust confidence based on validation timeframes
  let adjustedConfidence = currentSignal.confidence;
  
  // Validate with UPPER timeframes (MULTIPLE) - heavier penalties
  validation.upper.forEach(tf => {
    const signal = adjacentSignals.find(s => s.timeframe === tf);
    if (signal) {
      if (signal.direction !== currentSignal.direction && 
          signal.direction !== 'NEUTRAL' &&
          currentSignal.direction !== 'NEUTRAL') {
        // Contradiction = heavy penalty
        const penalty = signal.confidence > 70 ? 25 : 15;
        adjustedConfidence = Math.max(30, adjustedConfidence - penalty);
        console.log(`  ⚠️ Upper TF (${tf}) contradicts: ${signal.direction} - penalty: -${penalty}%`);
      } else if (signal.direction === currentSignal.direction) {
        // Agreement = bonus
        const bonus = signal.confidence > 70 ? 10 : 5;
        adjustedConfidence = Math.min(95, adjustedConfidence + bonus);
        console.log(`  ✅ Upper TF (${tf}) agrees - bonus: +${bonus}%`);
      } else if (signal.direction === 'NEUTRAL' && 
                 currentSignal.direction !== 'NEUTRAL' &&
                 currentSignal.confidence > 70) {
        // Upper is NEUTRAL but current is strong = no confirmation penalty
        const penalty = 15;
        adjustedConfidence = Math.max(35, adjustedConfidence - penalty);
        console.log(`  ⚠️ Upper TF (${tf}) is NEUTRAL - no confirmation penalty: -${penalty}%`);
      }
    }
  });
  
  // Validate with LOWER timeframes (MULTIPLE) - lighter adjustments
  validation.lower.forEach(tf => {
    const signal = adjacentSignals.find(s => s.timeframe === tf);
    if (signal) {
      if (signal.direction === currentSignal.direction && signal.confidence > 70) {
        // Lower agrees strongly = slight bonus
        const bonus = 5;
        adjustedConfidence = Math.min(95, adjustedConfidence + bonus);
        console.log(`  ✅ Lower TF (${tf}) agrees strongly - bonus: +${bonus}%`);
      } else if (signal.direction !== currentSignal.direction && 
                 signal.direction !== 'NEUTRAL' &&
                 currentSignal.direction !== 'NEUTRAL' &&
                 signal.confidence > 60) {
        // Lower contradicts strongly = penalty
        const penalty = 10;
        adjustedConfidence = Math.max(35, adjustedConfidence - penalty);
        console.log(`  ⚠️ Lower TF (${tf}) contradicts: ${signal.direction} - penalty: -${penalty}%`);
      }
    }
  });
  
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
  const validation = getValidationTimeframes(currentSignal.timeframe as IntradayTimeframe);
  
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
  
  // Specific warnings for upper TF conflicts
  validation.upper.forEach(tf => {
    const upperSignal = adjacentSignals.find(s => s.timeframe === tf);
    if (upperSignal && 
        upperSignal.direction !== currentSignal.direction &&
        upperSignal.direction !== 'NEUTRAL' &&
        currentSignal.direction !== 'NEUTRAL') {
      warnings.push(`TF ${tf} indica ${upperSignal.direction}`);
    }
  });
  
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
