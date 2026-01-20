import type { 
  OpenPosition, 
  PositionAnalysis, 
  TacticalAction 
} from './tradeRecommender';
import type { IntradaySignal, SignalDirection } from '@/hooks/useIntradaySignal';
import type { LiquidationData } from '@/hooks/useLiquidationPools';

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze open position and generate tactical recommendations
 */
export function analyzeOpenPosition(
  position: OpenPosition,
  currentSignal: IntradaySignal | null,
  liquidationData: LiquidationData | null,
  volatility: number
): PositionAnalysis | null {
  console.log('[PositionManager] Analyzing position:', position);
  
  if (!currentSignal || !liquidationData) {
    console.warn('[PositionManager] Missing signal or liquidation data');
    return null;
  }

  // 1. Check if current signal agrees with position
  const signalAgrees = 
    (position.direction === 'LONG' && currentSignal.direction === 'LONG') ||
    (position.direction === 'SHORT' && currentSignal.direction === 'SHORT');
  
  // 2. Calculate distance to liquidation
  const nearbyLiqZone = position.direction === 'LONG'
    ? liquidationData.longLiquidationPool.price
    : liquidationData.shortLiquidationPool.price;
  
  const distanceToLiq = position.direction === 'LONG'
    ? ((position.currentPrice - nearbyLiqZone) / position.currentPrice) * 100
    : ((nearbyLiqZone - position.currentPrice) / position.currentPrice) * 100;
  
  // 3. Determine risk level
  let riskLevel: 'safe' | 'moderate' | 'high' | 'critical';
  if (distanceToLiq > 5) riskLevel = 'safe';
  else if (distanceToLiq > 3) riskLevel = 'moderate';
  else if (distanceToLiq > 1.5) riskLevel = 'high';
  else riskLevel = 'critical';
  
  // 4. Generate tactical actions
  const actions = generateTacticalActions(
    position,
    currentSignal,
    liquidationData,
    volatility,
    distanceToLiq,
    signalAgrees
  );
  
  // 5. Determine overall recommendation
  const recommendation = determineRecommendation(
    position,
    signalAgrees,
    riskLevel,
    currentSignal.confidence
  );
  
  // 6. Generate reasoning
  const reasoning = generateReasoning(
    position,
    signalAgrees,
    riskLevel,
    currentSignal,
    distanceToLiq
  );
  
  return {
    position,
    currentSignal: {
      direction: currentSignal.direction,
      strength: currentSignal.confidence,
      agrees: signalAgrees
    },
    riskAssessment: {
      distanceToLiquidation: distanceToLiq,
      riskLevel,
      nearbyLiquidationZone: nearbyLiqZone
    },
    tacticalActions: actions,
    recommendation,
    reasoning
  };
}

// ============================================================================
// TACTICAL ACTIONS GENERATION
// ============================================================================

function generateTacticalActions(
  position: OpenPosition,
  signal: IntradaySignal,
  liquidationData: LiquidationData,
  volatility: number,
  distanceToLiq: number,
  signalAgrees: boolean
): TacticalAction[] {
  const actions: TacticalAction[] = [];
  const currentPrice = position.currentPrice;
  
  // CASE 1: Position in loss and signal does NOT agree
  if (position.pnlPercent < 0 && !signalAgrees) {
    
    // Action 1: Partial close to reduce exposure
    if (position.pnlPercent < -10) {
      actions.push({
        type: 'PARTIAL_CLOSE',
        triggerPrice: currentPrice,
        amount: position.currentSize * 0.25,
        amountPercent: 25,
        reason: 'Reducir riesgo: posición en pérdida y señal cambió de dirección',
        expectedEffect: {
          riskReduction: 'Reduce exposición en 25%',
          newPnL: position.pnlUSDT * 0.75
        },
        urgency: position.pnlPercent < -15 ? 'high' : 'medium'
      });
    }
    
    // Action 2: Full exit if critical loss or near liquidation
    if (position.pnlPercent < -20 || distanceToLiq < 2) {
      actions.push({
        type: 'FULL_EXIT',
        triggerPrice: currentPrice,
        amount: position.currentSize,
        amountPercent: 100,
        reason: 'Salida urgente: pérdida crítica o muy cerca de liquidación',
        expectedEffect: {
          riskReduction: 'Elimina riesgo completamente'
        },
        urgency: 'critical'
      });
    }
  }
  
  // CASE 2: Position in loss but signal agrees (tactical DCA)
  if (position.pnlPercent < 0 && signalAgrees && signal.confidence > 70) {
    
    const nearbyLiqZone = position.direction === 'LONG' 
      ? liquidationData.longLiquidationPool.price 
      : liquidationData.shortLiquidationPool.price;
    
    // Calculate DCA zone (slightly above liquidation)
    const dcaZone = position.direction === 'LONG'
      ? nearbyLiqZone * 1.015  // +1.5% above long pool
      : nearbyLiqZone * 0.985;  // -1.5% below short pool
    
    const dcaDistance = Math.abs((dcaZone - currentPrice) / currentPrice) * 100;
    
    if (dcaDistance > 1 && dcaDistance < 5) {
      // DCA only if zone is reasonably close
      const dcaAmount = position.currentSize * 0.15; // 15% of position
      
      // Calculate new average entry
      const newTotalSize = position.currentSize + dcaAmount;
      const newAvgEntry = (
        (position.entryPrice * position.currentSize) + 
        (dcaZone * dcaAmount)
      ) / newTotalSize;
      
      actions.push({
        type: 'DCA_BUY',
        triggerPrice: dcaZone,
        amount: dcaAmount,
        amountPercent: 15,
        reason: `DCA cerca de zona de liquidación ($${nearbyLiqZone.toFixed(0)}) para mejorar entry promedio`,
        expectedEffect: {
          newAvgEntry,
          riskReduction: `Mejora entry: $${position.entryPrice.toFixed(0)} → $${newAvgEntry.toFixed(0)}`
        },
        urgency: 'medium'
      });
    }
  }
  
  // CASE 3: Tactical scalping in rallies (for LONG in loss)
  if (position.direction === 'LONG' && position.pnlPercent < 0 && position.pnlPercent > -15) {
    
    // Detect potential minor rally (1-2% up)
    const rallyTarget = currentPrice * 1.015; // +1.5%
    
    if (rallyTarget < position.entryPrice) {
      // Rally doesn't reach entry, sell small amount to rebuy lower
      const scalpAmount = position.currentSize * 0.08; // 8% of position
      
      actions.push({
        type: 'SCALP_SELL',
        triggerPrice: rallyTarget,
        amount: scalpAmount,
        amountPercent: 8,
        reason: 'Vender en rally menor para recomprar más abajo y mejorar promedio',
        expectedEffect: {
          riskReduction: 'Ganas margen para recomprar ~1-2% abajo'
        },
        urgency: 'low'
      });
      
      // Suggest rebuy level
      const rebuyLevel = rallyTarget * 0.98; // -2% from rally
      
      actions.push({
        type: 'DCA_BUY',
        triggerPrice: rebuyLevel,
        amount: scalpAmount * 1.1, // Rebuy slightly more
        amountPercent: 9,
        reason: `Recomprar después del rally en $${rebuyLevel.toFixed(0)}`,
        expectedEffect: {
          newAvgEntry: position.entryPrice * 0.995, // ~0.5% improvement
          riskReduction: 'Reduce entry promedio ligeramente'
        },
        urgency: 'low'
      });
    }
  }
  
  // CASE 4: Tactical scalping in dips (for SHORT in loss)
  if (position.direction === 'SHORT' && position.pnlPercent < 0 && position.pnlPercent > -15) {
    
    // Detect potential minor dip (1-2% down)
    const dipTarget = currentPrice * 0.985; // -1.5%
    
    if (dipTarget > position.entryPrice) {
      const scalpAmount = position.currentSize * 0.08;
      
      actions.push({
        type: 'SCALP_SELL',
        triggerPrice: dipTarget,
        amount: scalpAmount,
        amountPercent: 8,
        reason: 'Cerrar parcial en dip para reabrir más arriba y mejorar promedio',
        expectedEffect: {
          riskReduction: 'Ganas margen para reabrir ~1-2% arriba'
        },
        urgency: 'low'
      });
    }
  }
  
  // CASE 5: Position in profit - Secure partially
  if (position.pnlPercent > 5) {
    actions.push({
      type: 'PARTIAL_CLOSE',
      triggerPrice: currentPrice,
      amount: position.currentSize * 0.3,
      amountPercent: 30,
      reason: 'Asegurar ganancias parciales',
      expectedEffect: {
        riskReduction: 'Garantiza 30% de la ganancia',
        newPnL: position.pnlUSDT * 0.7
      },
      urgency: 'low'
    });
  }
  
  // Sort by urgency
  return actions.sort((a, b) => {
    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
  });
}

// ============================================================================
// RECOMMENDATION DETERMINATION
// ============================================================================

function determineRecommendation(
  position: OpenPosition,
  signalAgrees: boolean,
  riskLevel: string,
  signalConfidence: number
): 'HOLD' | 'REDUCE' | 'DCA' | 'EXIT' | 'FLIP' {
  
  // EXIT: Critical risk
  if (riskLevel === 'critical' || position.pnlPercent < -20) {
    return 'EXIT';
  }
  
  // REDUCE: Signal changed and moderate loss
  if (!signalAgrees && position.pnlPercent < -10) {
    return 'REDUCE';
  }
  
  // FLIP: Very strong signal in opposite direction
  if (!signalAgrees && signalConfidence > 85) {
    return 'FLIP';
  }
  
  // DCA: Signal agrees and there's conviction
  if (signalAgrees && signalConfidence > 70 && position.pnlPercent < 0) {
    return 'DCA';
  }
  
  // HOLD: Default
  return 'HOLD';
}

// ============================================================================
// REASONING GENERATION
// ============================================================================

function generateReasoning(
  position: OpenPosition,
  signalAgrees: boolean,
  riskLevel: string,
  signal: IntradaySignal,
  distanceToLiq: number
): string[] {
  const reasoning: string[] = [];
  
  // Position state
  if (position.pnlPercent < 0) {
    reasoning.push(`Posición en pérdida: ${position.pnlPercent.toFixed(2)}%`);
  } else {
    reasoning.push(`Posición en ganancia: +${position.pnlPercent.toFixed(2)}%`);
  }
  
  // Signal agreement
  if (signalAgrees) {
    reasoning.push(`✅ Señal actual ${signal.direction} concuerda con tu posición (${signal.confidence.toFixed(0)}%)`);
  } else {
    reasoning.push(`⚠️ Señal actual ${signal.direction} contradice tu posición ${position.direction}`);
  }
  
  // Risk level
  if (riskLevel === 'critical') {
    reasoning.push(`🔴 RIESGO CRÍTICO: Solo ${distanceToLiq.toFixed(1)}% hasta liquidación`);
  } else if (riskLevel === 'high') {
    reasoning.push(`🟠 Riesgo alto: ${distanceToLiq.toFixed(1)}% hasta liquidación`);
  } else if (riskLevel === 'moderate') {
    reasoning.push(`🟡 Riesgo moderado: ${distanceToLiq.toFixed(1)}% hasta liquidación`);
  } else {
    reasoning.push(`🟢 Riesgo bajo: ${distanceToLiq.toFixed(1)}% de margen`);
  }
  
  return reasoning;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate PnL for a position given current price
 */
export function calculatePnL(
  entryPrice: number,
  currentPrice: number,
  size: number,
  leverage: number,
  direction: 'LONG' | 'SHORT'
): { pnlUSDT: number; pnlPercent: number } {
  if (!entryPrice || !currentPrice || entryPrice <= 0 || currentPrice <= 0) {
    return { pnlUSDT: 0, pnlPercent: 0 };
  }
  
  const priceChange = direction === 'LONG'
    ? (currentPrice - entryPrice) / entryPrice
    : (entryPrice - currentPrice) / entryPrice;
  
  const pnlPercent = priceChange * leverage * 100;
  const positionValue = size * entryPrice;
  const pnlUSDT = positionValue * priceChange * leverage;
  
  return { pnlUSDT, pnlPercent };
}

/**
 * Build OpenPosition from user input
 */
export function buildOpenPosition(
  asset: 'BTC' | 'ETH' | 'BNB',
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  size: number,
  leverage: number,
  currentPrice: number
): OpenPosition | null {
  // Validate inputs
  if (!entryPrice || entryPrice <= 0) return null;
  if (!size || size <= 0) return null;
  if (!leverage || leverage <= 0) return null;
  if (!currentPrice || currentPrice <= 0) return null;
  
  const { pnlUSDT, pnlPercent } = calculatePnL(
    entryPrice,
    currentPrice,
    size,
    leverage,
    direction
  );
  
  const positionValueUSDT = size * entryPrice;
  
  return {
    asset,
    direction,
    entryPrice,
    currentSize: size,
    leverage,
    positionValueUSDT,
    currentPrice,
    pnlUSDT,
    pnlPercent
  };
}
