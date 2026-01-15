// ============================================
// FASE A.1: Biblioteca de Métricas de Derivados
// Binance Futures API Integration
// ============================================

// DEBUG: Habilitar logs
const DEBUG = true;

function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[Derivatives] ${message}`, data ?? '');
  }
}

export interface OpenInterestData {
  openInterest: number; // En contratos
  openInterestUsd: number; // En USD
  change24h: number; // Porcentaje de cambio
  timestamp: number;
  trend: 'rising' | 'falling' | 'stable';
  signal: 'bullish' | 'bearish' | 'buildup' | 'neutral';
  interpretation: string;
}

export interface FundingRateData {
  fundingRate: number; // Rate actual (ej: 0.0001 = 0.01%)
  fundingRatePercent: number; // En porcentaje (ej: 0.01)
  nextFundingTime: number; // Timestamp del próximo funding
  level: 'extreme_positive' | 'high_positive' | 'normal' | 'low' | 'negative' | 'extreme_negative';
  signal: 'long_squeeze_risk' | 'short_squeeze_risk' | 'crowded_longs' | 'crowded_shorts' | 'neutral';
  interpretation: string;
  timestamp: number;
}

export interface DerivativesData {
  openInterest: OpenInterestData;
  fundingRate: FundingRateData;
  timestamp: number;
  combinedScore: number; // Score adicional para señal combinada
}

// Thresholds para Funding Rate
const FUNDING_THRESHOLDS = {
  EXTREME_POSITIVE: 0.10, // 0.10% - Muchos longs
  HIGH_POSITIVE: 0.05,    // 0.05% - Longs dominando
  LOW: 0.01,              // 0.01% - Normal
  NEGATIVE: -0.01,        // -0.01% - Shorts dominando
  EXTREME_NEGATIVE: -0.05 // -0.05% - Muchos shorts
};

// Thresholds para Open Interest cambio 24h
const OI_THRESHOLDS = {
  STRONG_RISE: 10,  // +10%
  RISE: 5,          // +5%
  FALL: -5,         // -5%
  STRONG_FALL: -10  // -10%
};

// Storage keys
const OI_HISTORY_KEY = 'derivatives-oi-history';
const LAST_DERIVATIVES_KEY = 'derivatives-last-valid';

// ============================================
// Historial en localStorage (48h)
// ============================================

interface OIHistoryEntry {
  timestamp: number;
  openInterestUsd: number;
}

function getOIHistory(): OIHistoryEntry[] {
  try {
    const stored = localStorage.getItem(OI_HISTORY_KEY);
    if (!stored) return [];
    const history = JSON.parse(stored);
    if (!Array.isArray(history)) return [];
    
    // Filtrar últimas 48 horas
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return history.filter((h: OIHistoryEntry) => h.timestamp > cutoff);
  } catch {
    return [];
  }
}

function saveOIHistory(current: number): void {
  try {
    const history = getOIHistory();
    history.push({ timestamp: Date.now(), openInterestUsd: current });
    
    // Mantener máximo 576 entries (cada 5 min por 48h)
    const trimmed = history.slice(-576);
    localStorage.setItem(OI_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving OI history:', e);
  }
}

function calculateOIChange24h(currentOI: number): number {
  const history = getOIHistory();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  // Encontrar el entry más cercano a hace 24h
  const oldEntry = history
    .filter(h => h.timestamp <= oneDayAgo)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  
  if (!oldEntry || oldEntry.openInterestUsd === 0) {
    // Usar el entry más antiguo disponible
    const oldest = history[0];
    if (!oldest || oldest.openInterestUsd === 0) return 0;
    return ((currentOI - oldest.openInterestUsd) / oldest.openInterestUsd) * 100;
  }
  
  return ((currentOI - oldEntry.openInterestUsd) / oldEntry.openInterestUsd) * 100;
}

// ============================================
// Fetch desde Binance Futures API
// ============================================

export async function fetchOpenInterest(): Promise<{ openInterest: number; openInterestUsd: number }> {
  try {
    debugLog('Fetching Open Interest from Binance...');
    
    // Primero obtener el precio actual para convertir a USD
    const priceUrl = 'https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT';
    debugLog('Price URL:', priceUrl);
    
    const priceResponse = await fetch(priceUrl);
    debugLog('Price Response status:', priceResponse.status);
    
    if (!priceResponse.ok) {
      throw new Error(`Binance price API error: ${priceResponse.status} ${priceResponse.statusText}`);
    }
    
    const priceData = await priceResponse.json();
    debugLog('Price data:', priceData);
    const btcPrice = parseFloat(priceData.price);
    
    // Obtener Open Interest
    const oiUrl = 'https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT';
    debugLog('OI URL:', oiUrl);
    
    const oiResponse = await fetch(oiUrl);
    debugLog('OI Response status:', oiResponse.status);
    
    if (!oiResponse.ok) {
      throw new Error(`Binance OI API error: ${oiResponse.status} ${oiResponse.statusText}`);
    }
    
    const oiData = await oiResponse.json();
    debugLog('OI Raw data:', oiData);
    
    const openInterest = parseFloat(oiData.openInterest);
    const openInterestUsd = openInterest * btcPrice;
    
    debugLog('OI Calculation:', {
      oiInBTC: openInterest,
      btcPrice,
      oiInUSD: `$${(openInterestUsd / 1e9).toFixed(2)}B`
    });
    
    return { openInterest, openInterestUsd };
  } catch (error) {
    console.error('[Derivatives] ❌ Error fetching Open Interest:', error);
    debugLog('⚠️ Using fallback OI value');
    // Fallback: $9.5B como valor estimado
    return { openInterest: 100000, openInterestUsd: 9_500_000_000 };
  }
}

export async function fetchFundingRate(): Promise<{ fundingRate: number; nextFundingTime: number }> {
  try {
    debugLog('Fetching Funding Rate from Binance...');
    
    const url = 'https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1';
    debugLog('Funding URL:', url);
    
    const response = await fetch(url);
    debugLog('Funding Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    debugLog('Funding Raw data:', data);
    
    if (!data || !data[0]) {
      throw new Error('Invalid funding rate data');
    }
    
    const result = {
      fundingRate: parseFloat(data[0].fundingRate),
      nextFundingTime: data[0].fundingTime + 28800000 // +8 horas al próximo
    };
    
    debugLog('Funding parsed:', {
      rate: `${(result.fundingRate * 100).toFixed(4)}%`,
      nextFunding: new Date(result.nextFundingTime).toLocaleString()
    });
    
    return result;
  } catch (error) {
    console.error('[Derivatives] ❌ Error fetching Funding Rate:', error);
    debugLog('⚠️ Using fallback Funding Rate');
    // Fallback: 0.01% como valor neutral
    return {
      fundingRate: 0.0001,
      nextFundingTime: Date.now() + (8 * 60 * 60 * 1000)
    };
  }
}

// ============================================
// Análisis de Open Interest
// ============================================

function analyzeOpenInterest(openInterestUsd: number, change24h: number): Pick<OpenInterestData, 'trend' | 'signal' | 'interpretation'> {
  let trend: OpenInterestData['trend'];
  let signal: OpenInterestData['signal'];
  let interpretation: string;
  
  // Determinar trend
  if (change24h > OI_THRESHOLDS.RISE) {
    trend = 'rising';
  } else if (change24h < OI_THRESHOLDS.FALL) {
    trend = 'falling';
  } else {
    trend = 'stable';
  }
  
  // Determinar signal e interpretación
  if (change24h >= OI_THRESHOLDS.STRONG_RISE) {
    signal = 'buildup';
    interpretation = 'Build-up fuerte - Movimiento grande próximo';
  } else if (change24h >= OI_THRESHOLDS.RISE) {
    signal = 'bullish';
    interpretation = 'Capital entrando al mercado';
  } else if (change24h <= OI_THRESHOLDS.STRONG_FALL) {
    signal = 'bearish';
    interpretation = 'Liquidaciones masivas - Capital saliendo';
  } else if (change24h <= OI_THRESHOLDS.FALL) {
    signal = 'bearish';
    interpretation = 'Capital saliendo del mercado';
  } else {
    signal = 'neutral';
    interpretation = 'Sin cambios significativos';
  }
  
  return { trend, signal, interpretation };
}

// ============================================
// Análisis de Funding Rate
// ============================================

function analyzeFundingRate(fundingRatePercent: number): Pick<FundingRateData, 'level' | 'signal' | 'interpretation'> {
  let level: FundingRateData['level'];
  let signal: FundingRateData['signal'];
  let interpretation: string;
  
  if (fundingRatePercent >= FUNDING_THRESHOLDS.EXTREME_POSITIVE) {
    level = 'extreme_positive';
    signal = 'long_squeeze_risk';
    interpretation = 'Longs extremos - Alto riesgo de barrido';
  } else if (fundingRatePercent >= FUNDING_THRESHOLDS.HIGH_POSITIVE) {
    level = 'high_positive';
    signal = 'crowded_longs';
    interpretation = 'Muchos longs - Riesgo moderado';
  } else if (fundingRatePercent > FUNDING_THRESHOLDS.LOW) {
    level = 'normal';
    signal = 'neutral';
    interpretation = 'Longs pagando a shorts (normal)';
  } else if (fundingRatePercent >= FUNDING_THRESHOLDS.NEGATIVE) {
    level = 'low';
    signal = 'neutral';
    interpretation = 'Mercado equilibrado';
  } else if (fundingRatePercent >= FUNDING_THRESHOLDS.EXTREME_NEGATIVE) {
    level = 'negative';
    signal = 'crowded_shorts';
    interpretation = 'Shorts dominando - Posible squeeze';
  } else {
    level = 'extreme_negative';
    signal = 'short_squeeze_risk';
    interpretation = 'Shorts extremos - Alto riesgo de squeeze alcista';
  }
  
  return { level, signal, interpretation };
}

// ============================================
// Cálculo de Score para Señal Combinada
// ============================================

function calculateDerivativesScore(oi: OpenInterestData, fr: FundingRateData): number {
  let score = 0;
  
  // Score por Open Interest
  if (oi.change24h >= OI_THRESHOLDS.STRONG_RISE) {
    score += 15; // Build-up fuerte
  } else if (oi.change24h >= OI_THRESHOLDS.RISE) {
    score += 10; // Capital entrando
  } else if (oi.change24h <= OI_THRESHOLDS.STRONG_FALL) {
    score -= 15; // Salida masiva
  } else if (oi.change24h <= OI_THRESHOLDS.FALL) {
    score -= 10; // Capital saliendo
  }
  
  // Score por Funding Rate
  if (fr.signal === 'short_squeeze_risk') {
    score += 10; // Posible squeeze alcista
  } else if (fr.signal === 'long_squeeze_risk') {
    score -= 10; // Riesgo de barrido de longs
  }
  
  // Penalización por crowding extremo
  if (fr.level === 'extreme_positive') {
    score -= 20; // Demasiados longs
  }
  
  return score;
}

// ============================================
// Función Principal
// ============================================

export async function fetchDerivativesData(): Promise<DerivativesData> {
  try {
    debugLog('=== Starting Derivatives Fetch ===');
    
    // Fetch en paralelo
    const [oiResult, frResult] = await Promise.all([
      fetchOpenInterest(),
      fetchFundingRate()
    ]);
    
    debugLog('✅ Both APIs completed');
    
    // Guardar en historial
    saveOIHistory(oiResult.openInterestUsd);
    
    // Calcular cambio 24h
    const change24h = calculateOIChange24h(oiResult.openInterestUsd);
    
    // Analizar OI
    const oiAnalysis = analyzeOpenInterest(oiResult.openInterestUsd, change24h);
    
    debugLog('OI Analysis:', {
      value: formatOpenInterest(oiResult.openInterestUsd),
      change24h: `${change24h.toFixed(2)}%`,
      signal: oiAnalysis.signal
    });
    
    // Convertir funding rate a porcentaje
    const fundingRatePercent = frResult.fundingRate * 100;
    
    // Analizar Funding Rate
    const frAnalysis = analyzeFundingRate(fundingRatePercent);
    
    debugLog('Funding Analysis:', {
      rate: formatFundingRate(fundingRatePercent),
      level: frAnalysis.level,
      signal: frAnalysis.signal
    });
    
    const openInterest: OpenInterestData = {
      openInterest: oiResult.openInterest,
      openInterestUsd: oiResult.openInterestUsd,
      change24h,
      timestamp: Date.now(),
      ...oiAnalysis
    };
    
    const fundingRate: FundingRateData = {
      fundingRate: frResult.fundingRate,
      fundingRatePercent,
      nextFundingTime: frResult.nextFundingTime,
      timestamp: Date.now(),
      ...frAnalysis
    };
    
    const combinedScore = calculateDerivativesScore(openInterest, fundingRate);
    
    const data: DerivativesData = {
      openInterest,
      fundingRate,
      timestamp: Date.now(),
      combinedScore
    };
    
    debugLog('=== Derivatives Fetch Complete ===', {
      oi: formatOpenInterest(data.openInterest.openInterestUsd),
      funding: formatFundingRate(data.fundingRate.fundingRatePercent),
      combinedScore
    });
    
    // Guardar último dato válido
    localStorage.setItem(LAST_DERIVATIVES_KEY, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('[Derivatives] ❌ Fatal error in fetchDerivativesData:', error);
    
    // Intentar usar último dato válido
    const cached = getLastValidDerivativesData();
    if (cached) {
      debugLog('⚠️ Using cached data from', new Date(cached.timestamp).toLocaleString());
      return cached;
    }
    
    throw error;
  }
}

export function getLastValidDerivativesData(): DerivativesData | null {
  try {
    const stored = localStorage.getItem(LAST_DERIVATIVES_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as DerivativesData;
    
    // Extender cache a 24 horas (los datos de derivados cambian lentamente)
    if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// Utilidades de Formato
// ============================================

export function formatOpenInterest(usd: number): string {
  if (usd >= 1_000_000_000) {
    return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  }
  if (usd >= 1_000_000) {
    return `$${(usd / 1_000_000).toFixed(1)}M`;
  }
  return `$${(usd / 1_000).toFixed(0)}K`;
}

export function formatFundingRate(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(4)}%`;
}

export function getFundingLevelLabel(level: FundingRateData['level']): string {
  const labels: Record<FundingRateData['level'], string> = {
    extreme_positive: 'Extremo +',
    high_positive: 'Alto',
    normal: 'Normal',
    low: 'Bajo',
    negative: 'Negativo',
    extreme_negative: 'Extremo -'
  };
  return labels[level];
}

export function getFundingLevelColor(level: FundingRateData['level']): string {
  const colors: Record<FundingRateData['level'], string> = {
    extreme_positive: 'text-danger',
    high_positive: 'text-warning',
    normal: 'text-muted-foreground',
    low: 'text-success',
    negative: 'text-success',
    extreme_negative: 'text-success'
  };
  return colors[level];
}
