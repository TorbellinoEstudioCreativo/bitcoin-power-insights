// ============================================================================
// MULTI-TIMEFRAME CONFLUENCE ANALYSIS
// ============================================================================

import { IntradayTimeframe, AllTimeframes } from '@/hooks/useIntradayData';
import type { HiddenTimeframe } from '@/hooks/useIntradayData';
import { logger } from '@/lib/logger';

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
// TIMEFRAME SEQUENCE (for adjacent TF lookup)
// ============================================================================

export const TIMEFRAME_SEQUENCE: IntradayTimeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

// Extended sequence including hidden 1w for confluence validation
export const TIMEFRAME_SEQUENCE_EXTENDED: AllTimeframes[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

// ============================================================================
// GET ADJACENT TIMEFRAMES (previous and next in sequence)
// ============================================================================

export function getSequentialAdjacentTFs(timeframe: IntradayTimeframe): {
  previous: AllTimeframes | null;
  next: AllTimeframes | null;
} {
  // Use extended sequence to include 1w as next for 1d
  const index = TIMEFRAME_SEQUENCE_EXTENDED.indexOf(timeframe);

  return {
    previous: index > 0 ? TIMEFRAME_SEQUENCE_EXTENDED[index - 1] : null,
    next: index < TIMEFRAME_SEQUENCE_EXTENDED.length - 1 ? TIMEFRAME_SEQUENCE_EXTENDED[index + 1] : null
  };
}

// ============================================================================
// LEGACY CONFLUENCE MATRIX (kept for validation timeframes)
// ============================================================================

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const CONFLUENCE_MATRIX: Record<Timeframe, {
  lower: AllTimeframes[];
  upper: AllTimeframes[];
}> = {
  '1m': {
    lower: [],
    upper: ['5m']
  },
  '5m': {
    lower: ['1m'],
    upper: ['15m']
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
// NEW CONFLUENCE CALCULATION - Average of matching adjacent TF confidence
// ============================================================================

/**
 * Calculate confluence score as average of adjacent TF confidence that match direction
 */
function calculateConfluence(
  currentSignal: TimeframeSignal,
  adjacentSignals: TimeframeSignal[]
): {
  confluenceScore: number;
  agreements: number;
  disagreements: number;
  adjustedConfidence: number;
  details: {
    previousTF?: { timeframe: string; direction: string; confidence: number; matches: boolean };
    nextTF?: { timeframe: string; direction: string; confidence: number; matches: boolean };
  };
} {
  logger.debug('=== MULTI-TF CONFLUENCE ===');
  logger.debug(`Current: ${currentSignal.timeframe} ${currentSignal.direction} (Conf: ${currentSignal.confidence}%)`);

  const { previous, next } = getSequentialAdjacentTFs(currentSignal.timeframe as IntradayTimeframe);

  let totalConfidence = 0;
  let count = 0;
  let agreements = 0;
  let disagreements = 0;
  const details: {
    previousTF?: { timeframe: string; direction: string; confidence: number; matches: boolean };
    nextTF?: { timeframe: string; direction: string; confidence: number; matches: boolean };
  } = {};

  // Check PREVIOUS timeframe (shorter)
  if (previous) {
    count++;
    const prevSignal = adjacentSignals.find(s => s.timeframe === previous);

    if (prevSignal) {
      const matches = prevSignal.direction === currentSignal.direction;
      details.previousTF = {
        timeframe: previous,
        direction: prevSignal.direction,
        confidence: prevSignal.confidence,
        matches
      };

      if (matches) {
        totalConfidence += prevSignal.confidence;
        agreements++;
      } else {
        disagreements++;
      }
    }
  }

  // Check NEXT timeframe (longer)
  if (next) {
    count++;
    const nextSignal = adjacentSignals.find(s => s.timeframe === next);

    if (nextSignal) {
      const matches = nextSignal.direction === currentSignal.direction;
      details.nextTF = {
        timeframe: next,
        direction: nextSignal.direction,
        confidence: nextSignal.confidence,
        matches
      };

      if (matches) {
        totalConfidence += nextSignal.confidence;
        agreements++;
      } else {
        disagreements++;
      }
    }
  }

  // Calculate confluence score (average of matching confidence)
  const confluenceScore = count > 0 ? Math.round(totalConfidence / count) : 0;

  logger.debug(`Multi-TF Result: ${confluenceScore}% (agreements: ${agreements}, disagreements: ${disagreements})`);

  // Adjust confidence based on confluence
  let adjustedConfidence = currentSignal.confidence;

  // Apply penalties/bonuses based on the new formula
  if (confluenceScore >= 80) {
    adjustedConfidence = Math.min(95, adjustedConfidence + 10);
  } else if (confluenceScore >= 60) {
    adjustedConfidence = Math.min(95, adjustedConfidence + 5);
  } else if (confluenceScore < 20) {
    adjustedConfidence = Math.max(30, adjustedConfidence - 15);
  } else if (confluenceScore < 40) {
    adjustedConfidence = Math.max(35, adjustedConfidence - 10);
  }

  return {
    confluenceScore,
    agreements,
    disagreements,
    adjustedConfidence: Math.round(adjustedConfidence),
    details
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
  // If no adjacent signals, return original confidence with 0 confluence
  if (adjacentSignals.length === 0) {
    return {
      adjustedConfidence: currentSignal.confidence,
      confluenceScore: 0,
      recommendation: 'Sin datos de otros timeframes',
      warnings: ['No hay TFs adyacentes para validar']
    };
  }

  const analysis = calculateConfluence(currentSignal, adjacentSignals);

  const warnings: string[] = [];
  let recommendation = '';

  // Generate recommendation based on confluence thresholds
  if (analysis.confluenceScore >= 80) {
    recommendation = 'Confluencia muy fuerte - Alta confiabilidad';
  } else if (analysis.confluenceScore >= 60) {
    recommendation = 'Confluencia buena - Señal confiable';
  } else if (analysis.confluenceScore >= 40) {
    recommendation = 'Confluencia moderada - Precaución';
    warnings.push('Confluencia moderada, considerar reducir tamaño');
  } else if (analysis.confluenceScore >= 20) {
    recommendation = 'Confluencia débil - Alto riesgo';
    warnings.push('Señales mixtas en timeframes adyacentes');
  } else {
    recommendation = 'Sin confluencia - Evitar entrada';
    warnings.push('Conflicto entre timeframes');
  }

  // Add specific warnings about adjacent TF conflicts
  if (analysis.details.previousTF && !analysis.details.previousTF.matches) {
    warnings.push(`${analysis.details.previousTF.timeframe}: ${analysis.details.previousTF.direction}`);
  }
  if (analysis.details.nextTF && !analysis.details.nextTF.matches) {
    warnings.push(`${analysis.details.nextTF.timeframe}: ${analysis.details.nextTF.direction}`);
  }

  return {
    adjustedConfidence: analysis.adjustedConfidence,
    confluenceScore: analysis.confluenceScore,
    recommendation,
    warnings
  };
}
