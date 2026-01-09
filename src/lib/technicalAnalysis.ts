// Technical Analysis utilities for trading

export interface NivelSoporte {
  precio: number;
  tipo: 'ema' | 'modelo' | 'fibonacci';
  nombre: string;
  fuerza: 'alta' | 'media' | 'baja';
  score: number;
  distancia: number; // % desde precio actual
  razon: string;
}

export interface EMAs {
  ema25: number;
  ema55: number;
  ema99: number;
  ema200: number;
}

// Calculate EMA from price array
export const calcularEMA = (precios: number[], periodo: number): number => {
  if (precios.length === 0) return 0;
  const k = 2 / (periodo + 1);
  let ema = precios[0];
  for (let i = 1; i < precios.length; i++) {
    ema = precios[i] * k + ema * (1 - k);
  }
  return ema;
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
