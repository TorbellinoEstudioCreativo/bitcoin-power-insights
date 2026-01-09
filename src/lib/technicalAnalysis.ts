// Technical Analysis utilities for trading
import { EMA } from 'technicalindicators';
import { CandleData, getOHLCTimeframe } from './historicalData';

export interface NivelSoporte {
  precio: number;
  tipo: 'ema' | 'modelo' | 'fibonacci' | 'pivot';
  nombre: string;
  timeframe?: '4H' | '1D' | '1W';
  fuerza: 'alta' | 'media' | 'baja';
  score: number;
  distancia: number; // % desde precio actual
  toques?: number; // Historical touches for pivots
  razon: string;
}

export interface EMAs {
  ema25: number;
  ema55: number;
  ema99: number;
  ema200: number;
}

// Calculate EMA using the technicalindicators library (same results as TradingView/Binance)
export const calcularEMA = (precios: number[], periodo: number): number => {
  if (precios.length === 0) return 0;
  
  if (precios.length < periodo) {
    console.warn(`[EMA] Not enough data for EMA${periodo} (have ${precios.length}, need ${periodo})`);
    return precios[precios.length - 1] || 0;
  }
  
  // Use the library's EMA calculation (proper SMA initialization + EMA formula)
  const emaValues = EMA.calculate({ 
    period: periodo, 
    values: precios 
  });
  
  // Return the most recent EMA value
  return emaValues[emaValues.length - 1] || 0;
};

// Calculate all EMAs at once (more efficient)
export const calcularTodasEMAs = (precios: number[]): EMAs => {
  return {
    ema25: calcularEMA(precios, 25),
    ema55: calcularEMA(precios, 55),
    ema99: calcularEMA(precios, 99),
    ema200: calcularEMA(precios, 200),
  };
};

// Generate simulated historical prices for EMA calculation
// Uses seeded random to ensure stability - same price range = same EMAs
export const generarPreciosSimulados = (precioActual: number, dias: number): number[] => {
  const precios: number[] = [];
  let precio = precioActual;
  
  // Seed based on price rounded to $1000 - prices within $1000 get same EMAs
  const seed = Math.floor(precioActual / 1000);
  
  // Seeded random function for deterministic results
  const seededRandom = (n: number): number => {
    const x = Math.sin(seed + n) * 10000;
    return x - Math.floor(x);
  };
  
  for (let i = dias; i >= 0; i--) {
    precios.unshift(precio);
    const volatilidad = 0.025;
    const tendencia = 0.0005;
    const cambio = (seededRandom(i) - 0.5) * volatilidad * 2 - tendencia;
    precio = precio * (1 - cambio);
  }
  
  return precios;
};

// Detect support levels below current price
export const detectarSoportes = (
  precioActual: number,
  emas: EMAs,
  pisoModelo: number
): NivelSoporte[] => {
  const soportes: NivelSoporte[] = [];
  
  // Add EMAs as supports if below current price
  if (emas.ema25 < precioActual) {
    const distancia = ((precioActual - emas.ema25) / precioActual) * 100;
    soportes.push({
      precio: Math.round(emas.ema25),
      tipo: 'ema',
      nombre: 'EMA(25)',
      timeframe: '1D',
      fuerza: 'alta',
      distancia,
      score: calcularScoreSoporte(distancia),
      razon: 'Soporte dinámico de corto plazo'
    });
  }
  
  if (emas.ema55 < precioActual) {
    const distancia = ((precioActual - emas.ema55) / precioActual) * 100;
    soportes.push({
      precio: Math.round(emas.ema55),
      tipo: 'ema',
      nombre: 'EMA(55)',
      timeframe: '1D',
      fuerza: 'alta',
      distancia,
      score: calcularScoreSoporte(distancia),
      razon: 'Soporte dinámico de medio plazo'
    });
  }
  
  if (emas.ema99 < precioActual) {
    const distancia = ((precioActual - emas.ema99) / precioActual) * 100;
    soportes.push({
      precio: Math.round(emas.ema99),
      tipo: 'ema',
      nombre: 'EMA(99)',
      timeframe: '1D',
      fuerza: 'media',
      distancia,
      score: calcularScoreSoporte(distancia),
      razon: 'Soporte dinámico de largo plazo'
    });
  }
  
  if (emas.ema200 < precioActual) {
    const distancia = ((precioActual - emas.ema200) / precioActual) * 100;
    soportes.push({
      precio: Math.round(emas.ema200),
      tipo: 'ema',
      nombre: 'EMA(200)',
      timeframe: '1D',
      fuerza: 'alta',
      distancia,
      score: calcularScoreSoporte(distancia) + 10, // EMA 200 is very strong
      razon: 'Soporte institucional clave'
    });
  }
  
  // Model floor (Piso 0.5x) excluded - too far for swing trading
  
  // Filter: remove duplicates (prices within 0.5% of each other)
  const soportesFiltrados = soportes
    .sort((a, b) => b.precio - a.precio) // Sort by price descending
    .filter((soporte, idx, arr) => {
      if (idx === 0) return true;
      const prevSoporte = arr[idx - 1];
      const diferencia = Math.abs(soporte.precio - prevSoporte.precio) / precioActual;
      return diferencia > 0.005; // Keep only if >0.5% different
    });
  
  // Filter: only nearby levels (<15% distance)
  const soportesCercanos = soportesFiltrados.filter(s => s.distancia < 15);
  
  return soportesCercanos
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

// Detect resistance levels above current price
export const detectarResistencias = (
  precioActual: number,
  emas: EMAs,
  techoModelo: number,
  precioModelo: number
): NivelSoporte[] => {
  const resistencias: NivelSoporte[] = [];
  
  // Add EMAs as resistances if above current price
  if (emas.ema25 > precioActual) {
    const distancia = ((emas.ema25 - precioActual) / precioActual) * 100;
    resistencias.push({
      precio: Math.round(emas.ema25),
      tipo: 'ema',
      nombre: 'EMA(25)',
      timeframe: '1D',
      fuerza: 'alta',
      distancia,
      score: calcularScoreResistencia(distancia),
      razon: 'Resistencia dinámica de corto plazo'
    });
  }
  
  if (emas.ema55 > precioActual) {
    const distancia = ((emas.ema55 - precioActual) / precioActual) * 100;
    resistencias.push({
      precio: Math.round(emas.ema55),
      tipo: 'ema',
      nombre: 'EMA(55)',
      timeframe: '1D',
      fuerza: 'alta',
      distancia,
      score: calcularScoreResistencia(distancia),
      razon: 'Resistencia dinámica de medio plazo'
    });
  }
  
  // Fair Value excluded - already shown in main card above
  
  // Add Fibonacci levels as resistance targets
  const fib1618 = precioActual * 1.618;
  if (fib1618 < techoModelo) {
    const distancia = ((fib1618 - precioActual) / precioActual) * 100;
    resistencias.push({
      precio: Math.round(fib1618),
      tipo: 'fibonacci',
      nombre: 'Fib 1.618',
      timeframe: '1D',
      fuerza: 'media',
      distancia,
      score: 70,
      razon: 'Extensión Fibonacci clásica'
    });
  }
  
  // Techo 3x excluded - too far for swing trading
  
  // Filter: remove duplicates (prices within 0.5% of each other)
  const resistenciasFiltradas = resistencias
    .sort((a, b) => a.precio - b.precio) // Sort by price ascending
    .filter((res, idx, arr) => {
      if (idx === 0) return true;
      const prevRes = arr[idx - 1];
      const diferencia = Math.abs(res.precio - prevRes.precio) / precioActual;
      return diferencia > 0.005; // Keep only if >0.5% different
    });
  
  // Filter: only nearby levels (<20% distance)
  const resistenciasCercanas = resistenciasFiltradas.filter(r => r.distancia < 20);
  
  return resistenciasCercanas
    .sort((a, b) => a.precio - b.precio)
    .slice(0, 5);
};

// Score calculation for supports (closer = better, but not too close)
const calcularScoreSoporte = (distancia: number): number => {
  if (distancia >= 2 && distancia <= 5) return 95;
  if (distancia < 2) return 75;
  if (distancia <= 8) return 85;
  if (distancia <= 15) return 70;
  return 50;
};

// Score calculation for resistances
const calcularScoreResistencia = (distancia: number): number => {
  if (distancia <= 5) return 90;
  if (distancia <= 10) return 80;
  if (distancia <= 20) return 70;
  return 60;
};

// Calculate opportunity score (0-100)
export const calcularScoreOportunidad = (ratio: number): number => {
  if (ratio <= 0.5) return 100;
  if (ratio <= 1.0) return Math.round(50 + ((1.0 - ratio) / 0.5) * 50);
  if (ratio <= 3.0) return Math.round(50 - ((ratio - 1.0) / 2.0) * 50);
  return 0;
};

// Get opportunity message based on score
export const getOpportunityMessage = (score: number, lang: 'es' | 'en' = 'es'): { emoji: string; message: string } => {
  if (lang === 'es') {
    if (score > 80) return { emoji: '🟢', message: 'Excelente momento para comprar' };
    if (score > 60) return { emoji: '🟢', message: 'Buena oportunidad' };
    if (score > 40) return { emoji: '🔵', message: 'Neutral' };
    if (score > 20) return { emoji: '🟡', message: 'Precaución - Sobrevalorado' };
    return { emoji: '🔴', message: 'Alto riesgo - Considerar venta' };
  } else {
    if (score > 80) return { emoji: '🟢', message: 'Excellent time to buy' };
    if (score > 60) return { emoji: '🟢', message: 'Good opportunity' };
    if (score > 40) return { emoji: '🔵', message: 'Neutral' };
    if (score > 20) return { emoji: '🟡', message: 'Caution - Overvalued' };
    return { emoji: '🔴', message: 'High risk - Consider selling' };
  }
};

// ===== REAL PIVOT DETECTION FROM OHLC DATA =====

// Count how many times price touched a level (within tolerance)
const countTouches = (
  data: CandleData[],
  targetPrice: number,
  tolerancePercent: number = 0.5
): number => {
  let count = 0;
  const tolerance = targetPrice * (tolerancePercent / 100);
  
  data.forEach(candle => {
    // Check if low touched the level
    if (Math.abs(candle.low - targetPrice) < tolerance) count++;
    // Check if high touched the level
    if (Math.abs(candle.high - targetPrice) < tolerance) count++;
  });
  
  return count;
};

// Detect pivot lows (supports) from OHLC data
export const detectarPivotesSoporte = (
  ohlcData: CandleData[],
  precioActual: number
): NivelSoporte[] => {
  const pivots: NivelSoporte[] = [];
  const window = 5; // Compare with 5 candles on each side
  
  // Determine timeframe from data
  const timeframe = getOHLCTimeframe(ohlcData.length, 90);
  
  for (let i = window; i < ohlcData.length - window; i++) {
    const candle = ohlcData[i];
    let isPivotLow = true;
    
    // Check if this is a local minimum
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && ohlcData[j].low < candle.low) {
        isPivotLow = false;
        break;
      }
    }
    
    if (isPivotLow && candle.low < precioActual) {
      const distancia = ((precioActual - candle.low) / precioActual) * 100;
      
      // Only include pivots within 15% distance
      if (distancia < 15) {
        const touches = countTouches(ohlcData, candle.low, 0.5);
        
        // Only include pivots with at least 2 touches
        if (touches >= 2) {
          pivots.push({
            precio: Math.round(candle.low),
            tipo: 'pivot',
            nombre: 'Pivote',
            timeframe,
            fuerza: touches >= 4 ? 'alta' : touches >= 3 ? 'media' : 'baja',
            score: 65 + Math.min(touches * 5, 25),
            distancia,
            toques: touches,
            razon: `Pivote ${timeframe} - ${touches} toques históricos`
          });
        }
      }
    }
  }
  
  return pivots;
};

// Detect pivot highs (resistances) from OHLC data
export const detectarPivotesResistencia = (
  ohlcData: CandleData[],
  precioActual: number
): NivelSoporte[] => {
  const pivots: NivelSoporte[] = [];
  const window = 5;
  
  const timeframe = getOHLCTimeframe(ohlcData.length, 90);
  
  for (let i = window; i < ohlcData.length - window; i++) {
    const candle = ohlcData[i];
    let isPivotHigh = true;
    
    // Check if this is a local maximum
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && ohlcData[j].high > candle.high) {
        isPivotHigh = false;
        break;
      }
    }
    
    if (isPivotHigh && candle.high > precioActual) {
      const distancia = ((candle.high - precioActual) / precioActual) * 100;
      
      // Only include pivots within 20% distance
      if (distancia < 20) {
        const touches = countTouches(ohlcData, candle.high, 0.5);
        
        if (touches >= 2) {
          pivots.push({
            precio: Math.round(candle.high),
            tipo: 'pivot',
            nombre: 'Pivote',
            timeframe,
            fuerza: touches >= 4 ? 'alta' : touches >= 3 ? 'media' : 'baja',
            score: 65 + Math.min(touches * 5, 25),
            distancia,
            toques: touches,
            razon: `Pivote ${timeframe} - ${touches} toques históricos`
          });
        }
      }
    }
  }
  
  return pivots;
};

// Merge similar levels (within 0.5% of each other)
export const fusionarNiveles = (
  niveles: NivelSoporte[],
  precioActual: number
): NivelSoporte[] => {
  if (niveles.length === 0) return [];
  
  const tolerance = precioActual * 0.005; // 0.5%
  const merged: NivelSoporte[] = [];
  
  // Sort by price
  const sorted = [...niveles].sort((a, b) => a.precio - b.precio);
  
  sorted.forEach(nivel => {
    const similar = merged.find(m => Math.abs(m.precio - nivel.precio) < tolerance);
    
    if (similar) {
      // Merge: keep higher score, combine touches, enhance reason
      if (nivel.score > similar.score) {
        similar.score = nivel.score;
      }
      if (nivel.toques && similar.toques) {
        similar.toques = Math.max(nivel.toques, similar.toques);
      }
      if (nivel.fuerza === 'alta' || similar.fuerza === 'baja') {
        similar.fuerza = nivel.fuerza;
      }
      // Add indicator if merging EMA with pivot
      if (nivel.tipo !== similar.tipo) {
        similar.razon = `${similar.razon} + ${nivel.nombre}`;
        similar.score += 10; // Confluence bonus
      }
    } else {
      merged.push({ ...nivel });
    }
  });
  
  return merged;
};
