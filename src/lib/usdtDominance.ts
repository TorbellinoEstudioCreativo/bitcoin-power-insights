// ============================================
// USDT Dominance - Sistema Avanzado (Fase 1)
// Usando Binance API (sin CORS issues)
// ============================================

import { logger } from '@/lib/logger';

// ============================================
// Debug System
// ============================================
const DEBUG = true;

function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    logger.log(`[USDT Dominance] ${message}`, data ?? '');
  }
}

// ============================================
// Binance API Configuration
// ============================================
const BINANCE_API_BASE = 'https://fapi.binance.com';
const USDT_CIRCULATING_SUPPLY = 145_000_000_000; // ~$145B (enero 2025)
const BTC_CIRCULATING_SUPPLY = 19_600_000; // ~19.6M BTC

export interface USDTDominanceData {
  // Datos básicos
  dominance: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  usdtMarketCap: number;
  totalMarketCap: number;
  timestamp: number;
  
  // Métricas avanzadas
  metrics: {
    change1h: number;
    change24h: number;
    change7d: number;
    min7d: number;
    max7d: number;
    avg7d: number;
    percentile: number;      // 0-100 (posición en rango de 7 días)
    velocity: number;        // % por hora
    velocityLabel: 'rápido' | 'medio' | 'lento' | 'estable';
  };
  
  // Clasificación de régimen
  regime: {
    level: 'extremo_alcista' | 'alcista' | 'neutral' | 'bajista' | 'extremo_bajista';
    label: string;
    emoji: string;
    color: string;
    description: string;
  };
  
  // Datos para sparkline (últimas 24h)
  sparklineData: number[];
  
  // Correlación con BTC
  btcCorrelation: {
    btcChange24h: number | null;
    pattern: 'rotacion_defensiva' | 'entrada_capital' | 'neutral' | 'divergencia';
    patternLabel: string;
    patternEmoji: string;
  };
}

// Interface para historial
interface HistoryEntry {
  timestamp: number;
  dominance: number;
  btcPrice?: number;
}

// Constantes
const EXTENDED_STORAGE_KEY = 'usdt-dominance-extended-history';
const LAST_VALID_DATA_KEY = 'usdt-dominance-last-valid';
const MAX_HISTORY_ENTRIES = 2016; // 7 días × 24h × 12 (cada 5 min)

// ============================================
// Funciones de Clasificación
// ============================================

function classifyRegime(dominance: number): USDTDominanceData['regime'] {
  if (dominance < 3.5) {
    return {
      level: 'extremo_alcista',
      label: 'Extremo Alcista',
      emoji: '🟢🟢',
      color: 'text-success',
      description: 'Euforia del mercado - Posible tope cercano'
    };
  } else if (dominance < 4.5) {
    return {
      level: 'alcista',
      label: 'Alcista',
      emoji: '🟢',
      color: 'text-success',
      description: 'Confianza en el mercado crypto'
    };
  } else if (dominance < 5.5) {
    return {
      level: 'neutral',
      label: 'Neutral',
      emoji: '🔵',
      color: 'text-info',
      description: 'Mercado equilibrado'
    };
  } else if (dominance < 6.5) {
    return {
      level: 'bajista',
      label: 'Bajista',
      emoji: '🟡',
      color: 'text-warning',
      description: 'Precaución - Rotación a cash'
    };
  } else {
    return {
      level: 'extremo_bajista',
      label: 'Extremo Bajista',
      emoji: '🔴🔴',
      color: 'text-danger',
      description: 'Pánico - Mucho capital en stablecoins'
    };
  }
}

// ============================================
// Funciones de Cálculo de Métricas
// ============================================

function calculateMetrics(
  currentDominance: number,
  history: HistoryEntry[]
): USDTDominanceData['metrics'] {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  // Filtrar por períodos
  const last1h = history.filter(h => h.timestamp > oneHourAgo);
  const last24h = history.filter(h => h.timestamp > oneDayAgo);
  const last7d = history.filter(h => h.timestamp > sevenDaysAgo);
  
  // Calcular cambios (comparar con el más antiguo de cada período)
  const change1h = last1h.length > 0 
    ? currentDominance - last1h[0].dominance 
    : 0;
  const change24h = last24h.length > 0 
    ? currentDominance - last24h[0].dominance 
    : 0;
  const change7d = last7d.length > 0 
    ? currentDominance - last7d[0].dominance 
    : 0;
  
  // Min, max, avg de 7 días
  const values7d = last7d.map(h => h.dominance);
  const min7d = values7d.length > 0 ? Math.min(...values7d) : currentDominance;
  const max7d = values7d.length > 0 ? Math.max(...values7d) : currentDominance;
  const avg7d = values7d.length > 0 
    ? values7d.reduce((a, b) => a + b, 0) / values7d.length 
    : currentDominance;
  
  // Percentil (posición en el rango de 7 días)
  const range = max7d - min7d;
  const percentile = range > 0 
    ? Math.round(((currentDominance - min7d) / range) * 100) 
    : 50;
  
  // Velocidad (cambio por hora en últimas 24h)
  const velocity = last24h.length >= 2 
    ? change24h / 24 
    : 0;
  
  // Clasificar velocidad
  let velocityLabel: 'rápido' | 'medio' | 'lento' | 'estable' = 'estable';
  if (Math.abs(velocity) > 0.02) velocityLabel = 'rápido';
  else if (Math.abs(velocity) > 0.01) velocityLabel = 'medio';
  else if (Math.abs(velocity) > 0.005) velocityLabel = 'lento';
  
  return {
    change1h,
    change24h,
    change7d,
    min7d,
    max7d,
    avg7d,
    percentile,
    velocity,
    velocityLabel
  };
}

// ============================================
// Funciones de Historial
// ============================================

function getExtendedHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(EXTENDED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error('Error loading USDT dominance history:', error);
    return [];
  }
}

function saveToExtendedHistory(dominance: number, btcPrice?: number): void {
  try {
    const history = getExtendedHistory();
    const newEntry: HistoryEntry = {
      timestamp: Date.now(),
      dominance,
      btcPrice
    };
    
    history.push(newEntry);
    
    // Mantener solo últimas MAX_HISTORY_ENTRIES lecturas (7 días)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(h => h.timestamp > sevenDaysAgo);
    
    // Si aún excede el límite, eliminar los más antiguos
    const trimmed = filtered.length > MAX_HISTORY_ENTRIES 
      ? filtered.slice(-MAX_HISTORY_ENTRIES) 
      : filtered;
    
    localStorage.setItem(EXTENDED_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    logger.error('Error saving USDT dominance history:', error);
  }
}

// ============================================
// Función de Sparkline
// ============================================

function generateSparklineData(history: HistoryEntry[]): number[] {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = history.filter(h => h.timestamp > oneDayAgo);
  
  if (last24h.length === 0) return [];
  
  // Agrupar en buckets de 1 hora (24 puntos máximo)
  const hourlyBuckets: { [key: number]: number[] } = {};
  
  last24h.forEach(entry => {
    const hourBucket = Math.floor(entry.timestamp / (60 * 60 * 1000));
    if (!hourlyBuckets[hourBucket]) {
      hourlyBuckets[hourBucket] = [];
    }
    hourlyBuckets[hourBucket].push(entry.dominance);
  });
  
  // Promediar cada bucket y ordenar cronológicamente
  const sparkline = Object.keys(hourlyBuckets)
    .sort((a, b) => Number(a) - Number(b))
    .map(bucket => {
      const values = hourlyBuckets[Number(bucket)];
      return values.reduce((a, b) => a + b, 0) / values.length;
    });
  
  return sparkline;
}

// ============================================
// Función de Correlación BTC
// ============================================

function determineBtcCorrelation(
  usdtChange24h: number,
  btcChange24h: number | null
): USDTDominanceData['btcCorrelation'] {
  if (btcChange24h === null) {
    return {
      btcChange24h: null,
      pattern: 'neutral',
      patternLabel: 'Sin datos BTC',
      patternEmoji: '⚪'
    };
  }
  
  // USDT sube + BTC baja = Rotación defensiva (bajista)
  if (usdtChange24h > 0.05 && btcChange24h < -1) {
    return {
      btcChange24h,
      pattern: 'rotacion_defensiva',
      patternLabel: 'Rotación Defensiva',
      patternEmoji: '🔴'
    };
  }
  
  // USDT baja + BTC sube = Entrada de capital (alcista)
  if (usdtChange24h < -0.05 && btcChange24h > 1) {
    return {
      btcChange24h,
      pattern: 'entrada_capital',
      patternLabel: 'Entrada de Capital',
      patternEmoji: '🟢'
    };
  }
  
  // Movimientos en la misma dirección inesperados = Divergencia
  if ((usdtChange24h > 0.1 && btcChange24h > 2) || 
      (usdtChange24h < -0.1 && btcChange24h < -2)) {
    return {
      btcChange24h,
      pattern: 'divergencia',
      patternLabel: 'Divergencia',
      patternEmoji: '🟣'
    };
  }
  
  return {
    btcChange24h,
    pattern: 'neutral',
    patternLabel: 'Sin patrón claro',
    patternEmoji: '🔵'
  };
}

// ============================================
// Funciones de Caché
// ============================================

function saveLastValidData(data: USDTDominanceData): void {
  try {
    localStorage.setItem(LAST_VALID_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Error saving last valid USDT data:', error);
  }
}

export function getLastValidData(): USDTDominanceData | null {
  try {
    const stored = localStorage.getItem(LAST_VALID_DATA_KEY);
    if (stored) {
      const data = JSON.parse(stored) as USDTDominanceData;
      // CAMBIO: Extender cache de 1 hora a 24 horas
      // USDT Dominance cambia lentamente, datos de hasta 24h son útiles
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    }
    return null;
  } catch (error) {
    logger.error('Error loading last valid USDT data:', error);
    return null;
  }
}

// ============================================
// Función para obtener datos de Binance
// ============================================

async function fetchDominanceFromBinance(): Promise<{
  dominance: number;
  usdtMarketCap: number;
  totalMarketCap: number;
  btcPrice: number;
}> {
  debugLog('Fetching data from Binance...');
  
  // 1. Obtener precio BTC
  const priceUrl = `${BINANCE_API_BASE}/fapi/v1/ticker/price?symbol=BTCUSDT`;
  debugLog('Price URL:', priceUrl);
  
  const priceResponse = await fetch(priceUrl);
  
  if (!priceResponse.ok) {
    throw new Error(`Binance price error: ${priceResponse.status}`);
  }
  
  const priceData = await priceResponse.json();
  const btcPrice = parseFloat(priceData.price);
  
  debugLog('BTC Price:', btcPrice);
  
  // 2. Calcular market caps estimados
  // BTC Market Cap = BTC Price × Circulating Supply
  const btcMarketCap = btcPrice * BTC_CIRCULATING_SUPPLY;
  
  // Total Crypto Market Cap estimado (BTC = ~55% del mercado en enero 2025)
  const BTC_DOMINANCE_ESTIMATE = 0.55;
  const totalMarketCap = btcMarketCap / BTC_DOMINANCE_ESTIMATE;
  
  // USDT Market Cap (supply conocido, precio ~$1)
  const usdtMarketCap = USDT_CIRCULATING_SUPPLY;
  
  // Calcular dominancia
  const dominance = (usdtMarketCap / totalMarketCap) * 100;
  
  debugLog('Calculation:', {
    btcMarketCap: `$${(btcMarketCap / 1e12).toFixed(2)}T`,
    totalMarketCap: `$${(totalMarketCap / 1e12).toFixed(2)}T`,
    usdtMarketCap: `$${(usdtMarketCap / 1e9).toFixed(0)}B`,
    dominance: `${dominance.toFixed(2)}%`
  });
  
  return { dominance, usdtMarketCap, totalMarketCap, btcPrice };
}

// ============================================
// Función Principal de Fetch
// ============================================

export async function fetchUSDTDominance(btcChange24h?: number): Promise<USDTDominanceData> {
  try {
    debugLog('=== Starting USDT Dominance Fetch ===');
    
    // NUEVO: Usar Binance en vez de CoinGecko (sin CORS issues)
    const { dominance, usdtMarketCap, totalMarketCap, btcPrice } = await fetchDominanceFromBinance();
    
    // Guardar en historial extendido
    saveToExtendedHistory(dominance, btcPrice);
    
    // Obtener historial para cálculos
    const history = getExtendedHistory();
    
    // Calcular métricas avanzadas
    const metrics = calculateMetrics(dominance, history);
    
    // Clasificar régimen
    const regime = classifyRegime(dominance);
    
    // Generar sparkline
    const sparklineData = generateSparklineData(history);
    
    // Determinar correlación con BTC
    const btcCorrelation = determineBtcCorrelation(metrics.change24h, btcChange24h ?? null);
    
    // Calcular trend basado en cambio 24h
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (metrics.change24h > 0.05) trend = 'up';
    else if (metrics.change24h < -0.05) trend = 'down';
    
    const result: USDTDominanceData = {
      dominance,
      trend,
      change: metrics.change24h,
      usdtMarketCap,
      totalMarketCap,
      timestamp: Date.now(),
      metrics,
      regime,
      sparklineData,
      btcCorrelation
    };
    
    // Guardar como último dato válido para fallback
    saveLastValidData(result);
    
    debugLog('=== USDT Dominance Fetch Complete ===', {
      dominance: `${dominance.toFixed(2)}%`,
      regime: regime.label,
      trend
    });
    
    return result;
    
  } catch (error) {
    debugLog('❌ Error fetching USDT Dominance:', error);
    
    // En caso de error, intentar usar el último dato válido
    const lastValid = getLastValidData();
    if (lastValid) {
      debugLog('⚠️ Using cached USDT dominance data');
      return lastValid;
    }
    
    // Si no hay caché, retornar valores por defecto
    debugLog('⚠️ No cache available, using defaults');
    return defaultUSDTDominanceData;
  }
}

// ============================================
// Valores por defecto para placeholderData
// ============================================

export const defaultUSDTDominanceData: USDTDominanceData = {
  dominance: 4.5,
  trend: 'neutral',
  change: 0,
  usdtMarketCap: 0,
  totalMarketCap: 0,
  timestamp: 0,
  metrics: {
    change1h: 0,
    change24h: 0,
    change7d: 0,
    min7d: 4.5,
    max7d: 4.5,
    avg7d: 4.5,
    percentile: 50,
    velocity: 0,
    velocityLabel: 'estable'
  },
  regime: {
    level: 'neutral',
    label: 'Neutral',
    emoji: '🔵',
    color: 'text-info',
    description: 'Mercado equilibrado'
  },
  sparklineData: [],
  btcCorrelation: {
    btcChange24h: null,
    pattern: 'neutral',
    patternLabel: 'Sin datos',
    patternEmoji: '⚪'
  }
};
