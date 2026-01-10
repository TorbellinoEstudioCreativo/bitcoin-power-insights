import { useMemo, useRef } from 'react';
import { NivelSoporte } from '@/lib/technicalAnalysis';

export interface OrdenCompra {
  nivel: number;
  precio: number;
  tipo: string;
  nombre: string;
  timeframe?: '4H' | '1D' | '1W' | 'PSYCH';
  toques?: number;
  montoUSDT: number;
  btcAmount: number;
  distancia: number;
  score: number;
  razon: string;
  // Confluence tracking
  indicadores?: Array<{ nombre: string; timeframe?: string }>;
  esConfluencia?: boolean;
}

export interface OrdenVenta {
  nivel: number;
  precio: number;
  tipo: string;
  nombre: string;
  timeframe?: '4H' | '1D' | '1W' | 'PSYCH';
  toques?: number;
  porcentaje: number;
  cantidadUSDT: number;
  gananciaUSD: number;
  retorno: number;
  razon: string;
  // Confluence tracking
  indicadores?: Array<{ nombre: string; timeframe?: string }>;
  esConfluencia?: boolean;
}

export interface OrdenesCompraResult {
  recomendacion: 'COMPRAR_EN_NIVELES' | 'NO_COMPRAR' | 'ESPERAR';
  razon: string;
  ordenes: OrdenCompra[];
}

export interface OrdenesVentaResult {
  estrategia: 'CONSERVADOR' | 'BALANCEADO' | 'REDUCIR' | 'SALIR' | 'SALIDA_ESTRATEGICA';
  ordenes: OrdenVenta[];
  totalGanancia: number;
  porcentajeTotal: number;
  isExitStrategy?: boolean;
}

export interface TradingInputs {
  apalancamiento: number;
  usdtDisponibles: number;
  tamañoPosicion: number;
  precioEntrada: number;
}

/**
 * Suaviza un precio aplicando peso exponencial (70% anterior, 30% nuevo)
 * Solo aplica si el cambio es menor al umbral (2%)
 */
function smoothPrice(prevPrice: number, newPrice: number, weight: number = 0.7, threshold: number = 0.02): number {
  if (prevPrice === 0) return newPrice;
  
  const change = Math.abs((newPrice - prevPrice) / prevPrice);
  
  // Si el cambio es mayor al umbral, usar precio nuevo directamente
  if (change > threshold) {
    return newPrice;
  }
  
  // Aplicar suavizado exponencial
  return Math.round(prevPrice * weight + newPrice * (1 - weight));
}

/**
 * Suaviza órdenes de compra comparando con las anteriores
 */
function smoothBuyOrders(
  newOrders: OrdenCompra[],
  prevOrders: OrdenCompra[] | null
): OrdenCompra[] {
  if (!prevOrders || prevOrders.length === 0) return newOrders;
  
  return newOrders.map((order, idx) => {
    const prevOrder = prevOrders[idx];
    if (!prevOrder) return order;
    
    return {
      ...order,
      precio: smoothPrice(prevOrder.precio, order.precio),
      montoUSDT: smoothPrice(prevOrder.montoUSDT, order.montoUSDT),
    };
  });
}

/**
 * Suaviza órdenes de venta comparando con las anteriores
 */
function smoothSellOrders(
  newOrders: OrdenVenta[],
  prevOrders: OrdenVenta[] | null
): OrdenVenta[] {
  if (!prevOrders || prevOrders.length === 0) return newOrders;
  
  return newOrders.map((order, idx) => {
    const prevOrder = prevOrders[idx];
    if (!prevOrder) return order;
    
    return {
      ...order,
      precio: smoothPrice(prevOrder.precio, order.precio),
      gananciaUSD: smoothPrice(prevOrder.gananciaUSD, order.gananciaUSD),
      cantidadUSDT: smoothPrice(prevOrder.cantidadUSDT, order.cantidadUSDT),
    };
  });
}

export function useTradingOrders(
  precioActual: number,
  ratio: number,
  soportes: NivelSoporte[],
  resistencias: NivelSoporte[],
  inputs: TradingInputs,
  shouldRecalculate: boolean = true,
  emas?: { ema25: number; ema55: number; ema99: number; ema200: number }
) {
  // Mantener referencia a órdenes anteriores para suavizado
  const prevOrdenesCompraRef = useRef<OrdenCompra[] | null>(null);
  const prevOrdenesVentaRef = useRef<OrdenVenta[] | null>(null);
  
  return useMemo(() => {
    // Si no debe recalcular y tenemos órdenes anteriores, devolverlas
    if (!shouldRecalculate && prevOrdenesCompraRef.current && prevOrdenesVentaRef.current) {
      return {
        ordenesCompra: {
          recomendacion: 'COMPRAR_EN_NIVELES' as const,
          razon: 'Niveles estables',
          ordenes: prevOrdenesCompraRef.current
        },
        ordenesVenta: {
          estrategia: 'BALANCEADO' as const,
          ordenes: prevOrdenesVentaRef.current,
          totalGanancia: prevOrdenesVentaRef.current.reduce((sum, o) => sum + o.gananciaUSD, 0),
          porcentajeTotal: prevOrdenesVentaRef.current.reduce((sum, o) => sum + o.porcentaje, 0)
        }
      };
    }
    
    // Calcular nuevas órdenes
    const rawOrdenesCompra = calcularOrdenesCompra(
      precioActual,
      ratio,
      soportes,
      inputs.usdtDisponibles
    );
    
    const rawOrdenesVenta = calcularOrdenesVenta(
      precioActual,
      inputs.precioEntrada,
      inputs.tamañoPosicion,
      ratio,
      resistencias,
      emas
    );
    
    // Aplicar suavizado
    const smoothedBuyOrders = smoothBuyOrders(rawOrdenesCompra.ordenes, prevOrdenesCompraRef.current);
    const smoothedSellOrders = smoothSellOrders(rawOrdenesVenta.ordenes, prevOrdenesVentaRef.current);
    
    // Actualizar referencias
    prevOrdenesCompraRef.current = smoothedBuyOrders;
    prevOrdenesVentaRef.current = smoothedSellOrders;
    
    // Recalcular totales con órdenes suavizadas
    const totalGanancia = smoothedSellOrders.reduce((sum, o) => sum + o.gananciaUSD, 0);
    const porcentajeTotal = smoothedSellOrders.reduce((sum, o) => sum + o.porcentaje, 0);
    
    return {
      ordenesCompra: {
        ...rawOrdenesCompra,
        ordenes: smoothedBuyOrders
      },
      ordenesVenta: {
        ...rawOrdenesVenta,
        ordenes: smoothedSellOrders,
        totalGanancia,
        porcentajeTotal
      }
    };
  }, [precioActual, ratio, soportes, resistencias, inputs, shouldRecalculate]);
}

// Generate default buy levels based on percentage when no technical supports
function generateDefaultBuyLevels(precioActual: number, usdtDisponibles: number): OrdenCompra[] {
  const distancias = [1, 2, 3, 5, 7]; // Percentage drops for DCA
  const numNiveles = distancias.length;
  const porcentajePorNivel = 100 / numNiveles;
  
  return distancias.map((distancia, idx) => ({
    nivel: idx + 1,
    precio: Math.round(precioActual * (1 - distancia / 100)),
    tipo: 'porcentaje',
    nombre: `-${distancia}%`,
    montoUSDT: Math.round(usdtDisponibles * (porcentajePorNivel / 100)),
    btcAmount: (usdtDisponibles * (porcentajePorNivel / 100)) / (precioActual * (1 - distancia / 100)),
    distancia,
    score: 80 - idx * 5,
    razon: idx <= 1 ? 'Swing trading' : 'Promedio hacia abajo (DCA)'
  }));
}

function calcularOrdenesCompra(
  precioActual: number,
  ratio: number,
  soportes: NivelSoporte[],
  usdtDisponibles: number
): OrdenesCompraResult {
  // ALWAYS generate buy levels - never return empty
  
  // If no technical supports, generate default percentage-based levels
  if (soportes.length === 0) {
    const nivelesDefault = generateDefaultBuyLevels(precioActual, usdtDisponibles);
    return {
      recomendacion: ratio > 1.2 ? 'NO_COMPRAR' : 'COMPRAR_EN_NIVELES',
      razon: ratio > 1.2 
        ? 'Bitcoin sobrevalorado - Comprar solo en soportes fuertes'
        : 'Niveles de compra sugeridos (DCA)',
      ordenes: nivelesDefault
    };
  }
  
  // Distribute USDT across top 3 supports
  const numNiveles = Math.min(soportes.length, 3);
  const porcentajePorNivel = 100 / numNiveles;
  
  const ordenes: OrdenCompra[] = soportes.slice(0, 3).map((soporte, idx) => {
    const montoUSDT = usdtDisponibles * (porcentajePorNivel / 100);
    const btcAmount = montoUSDT / soporte.precio;
    
    return {
      nivel: idx + 1,
      precio: soporte.precio,
      tipo: soporte.tipo,
      nombre: soporte.esConfluencia ? `Confluencia (${soporte.indicadores?.length || 1})` : soporte.nombre,
      timeframe: soporte.timeframe,
      toques: soporte.toques,
      montoUSDT: Math.round(montoUSDT),
      btcAmount,
      distancia: soporte.distancia,
      score: soporte.score,
      razon: soporte.razon,
      // Pass confluence data
      indicadores: soporte.indicadores,
      esConfluencia: soporte.esConfluencia
    };
  });
  
  return {
    recomendacion: ratio > 1.2 ? 'NO_COMPRAR' : 'COMPRAR_EN_NIVELES',
    razon: ratio > 1.2 
      ? 'Bitcoin sobrevalorado - Precaución al comprar'
      : ratio < 0.8 
        ? 'Excelente momento - Bitcoin muy infravalorado'
        : 'Buena oportunidad - Precio cerca de fair value',
    ordenes
  };
}

// Generate fallback resistances from EMAs when no technical resistances exist
function generateFallbackResistances(
  precioActual: number,
  emas?: { ema25: number; ema55: number; ema99: number; ema200: number }
): Array<{ precio: number; nombre: string; tipo: string; timeframe: '1D' | 'PSYCH'; razon: string; distancia: number }> {
  const resistencias: Array<any> = [];
  
  // 1. FIRST: Detect EMAs as resistances (above current price)
  if (emas) {
    const emasArray = [
      { valor: emas.ema25, nombre: 'EMA(25)' },
      { valor: emas.ema55, nombre: 'EMA(55)' },
      { valor: emas.ema99, nombre: 'EMA(99)' },
      { valor: emas.ema200, nombre: 'EMA(200)' }
    ];
    
    emasArray.forEach(ema => {
      // Check valid and ABOVE current price
      if (ema.valor && ema.valor > 0 && ema.valor > precioActual) {
        const distancia = ((ema.valor - precioActual) / precioActual) * 100;
        
        // Include EMAs up to 25% above
        if (distancia < 25) {
          resistencias.push({
            precio: Math.round(ema.valor),
            nombre: ema.nombre,
            tipo: 'ema',
            timeframe: '1D' as const,
            distancia,
            razon: `${ema.nombre} diaria - Resistencia dinámica`
          });
        }
      }
    });
  }
  
  // 2. THEN: Add round numbers ONLY if few EMAs found
  if (resistencias.length < 2) {
    const nivelesRedondos = [95000, 100000, 105000, 110000, 115000, 120000];
    
    nivelesRedondos.forEach(nivel => {
      if (nivel > precioActual && nivel < precioActual * 1.30) {
        const distancia = ((nivel - precioActual) / precioActual) * 100;
        resistencias.push({
          precio: nivel,
          nombre: `$${nivel / 1000}K`,
          tipo: 'redondo',
          timeframe: 'PSYCH' as const,
          distancia,
          razon: nivel === 100000 
            ? 'Nivel psicológico principal - 100K' 
            : `Resistencia psicológica ${nivel / 1000}K`
        });
      }
    });
  }
  
  // 3. Prioritize EMAs over round numbers
  return resistencias
    .sort((a, b) => {
      // EMAs first
      if (a.tipo === 'ema' && b.tipo === 'redondo') return -1;
      if (a.tipo === 'redondo' && b.tipo === 'ema') return 1;
      // Then by proximity
      return a.precio - b.precio;
    })
    .slice(0, 5);
}

// Generate exit strategy levels when in loss - uses real levels instead of math percentages
function generateExitStrategy(
  precioActual: number,
  precioEntrada: number,
  tamañoPosicion: number,
  currentPL: number,
  emas?: { ema25: number; ema55: number; ema99: number; ema200: number }
): OrdenesVentaResult {
  const lossPercent = Math.abs(currentPL);
  
  // Get real resistance levels (now with EMAs)
  const resistenciasReales = generateFallbackResistances(precioActual, emas);
  
  // % to sell based on loss magnitude
  let percentages: number[];
  if (lossPercent > 10) {
    percentages = [20, 20, 20, 20, 20]; // Exit 100%
  } else if (lossPercent > 5) {
    percentages = [15, 15, 15, 15, 0]; // Exit 60%
  } else {
    percentages = [10, 10, 10, 10, 0]; // Exit 40%
  }
  
  const ordenes: OrdenVenta[] = resistenciasReales
    .slice(0, percentages.filter(p => p > 0).length)
    .map((resistencia, idx) => {
      const porcentaje = percentages[idx];
      const cantidadUSDT = tamañoPosicion * (porcentaje / 100);
      const retorno = precioEntrada > 0 
        ? ((resistencia.precio - precioEntrada) / precioEntrada) * 100
        : 0;
      const gananciaUSD = Math.round(cantidadUSDT * (retorno / 100));
      
      return {
        nivel: idx + 1,
        precio: resistencia.precio,
        tipo: resistencia.tipo,
        nombre: resistencia.nombre,
        timeframe: resistencia.timeframe,
        porcentaje,
        cantidadUSDT: Math.round(cantidadUSDT),
        gananciaUSD,
        retorno,
        razon: resistencia.razon,
        indicadores: [{ nombre: resistencia.nombre, timeframe: resistencia.timeframe }],
        esConfluencia: false
      };
    });
  
  const totalGanancia = ordenes.reduce((sum, o) => sum + o.gananciaUSD, 0);
  const porcentajeTotal = ordenes.reduce((sum, o) => sum + o.porcentaje, 0);
  
  return {
    estrategia: 'SALIDA_ESTRATEGICA',
    ordenes,
    totalGanancia,
    porcentajeTotal,
    isExitStrategy: true
  };
}

function calcularOrdenesVenta(
  precioActual: number,
  precioEntrada: number,
  tamañoPosicion: number,
  ratio: number,
  resistencias: NivelSoporte[],
  emas?: { ema25: number; ema55: number; ema99: number; ema200: number }
): OrdenesVentaResult {
  // Check if in loss - use exit strategy
  const isInLoss = precioEntrada > 0 && precioActual < precioEntrada;
  const currentPL = precioEntrada > 0 
    ? ((precioActual - precioEntrada) / precioEntrada) * 100 
    : 0;
  
  if (isInLoss) {
    return generateExitStrategy(precioActual, precioEntrada, tamañoPosicion, currentPL, emas);
  }
  
  // In profit - use take-profit strategy
  let porcentajes: number[];
  let estrategia: OrdenesVentaResult['estrategia'];
  
  if (ratio < 0.8) {
    estrategia = 'CONSERVADOR';
    porcentajes = [10, 10]; // Only 20% total
  } else if (ratio < 1.2) {
    estrategia = 'BALANCEADO';
    porcentajes = [15, 15, 15]; // 45% total
  } else if (ratio < 2.0) {
    estrategia = 'REDUCIR';
    porcentajes = [20, 20, 20]; // 60% total
  } else {
    estrategia = 'SALIR';
    porcentajes = [25, 25, 25, 25]; // 100% total
  }
  
  // If no resistances, generate real levels (EMAs + round numbers) instead of percentages
  if (resistencias.length === 0) {
    const resistenciasReales = generateFallbackResistances(precioActual, emas);
    
    const ordenes: OrdenVenta[] = resistenciasReales
      .slice(0, porcentajes.length)
      .map((resistencia, idx) => {
        const porcentaje = porcentajes[idx] || 0;
        const cantidadUSDT = tamañoPosicion * (porcentaje / 100);
        const retorno = precioEntrada > 0 
          ? ((resistencia.precio - precioEntrada) / precioEntrada) * 100
          : resistencia.distancia;
        const gananciaUSD = Math.round(cantidadUSDT * (retorno / 100));
        
        return {
          nivel: idx + 1,
          precio: resistencia.precio,
          tipo: resistencia.tipo,
          nombre: resistencia.nombre,
          timeframe: resistencia.timeframe,
          porcentaje,
          cantidadUSDT: Math.round(cantidadUSDT),
          gananciaUSD,
          retorno,
          razon: resistencia.razon,
          indicadores: [{ nombre: resistencia.nombre, timeframe: resistencia.timeframe }],
          esConfluencia: false
        };
      });
    
    return {
      estrategia,
      ordenes,
      totalGanancia: ordenes.reduce((sum, o) => sum + o.gananciaUSD, 0),
      porcentajeTotal: ordenes.reduce((sum, o) => sum + o.porcentaje, 0),
      isExitStrategy: false
    };
  }
  
  const ordenes: OrdenVenta[] = resistencias
    .slice(0, porcentajes.length)
    .map((resistencia, idx) => {
      const porcentaje = porcentajes[idx] || 0;
      const cantidadUSDT = tamañoPosicion * (porcentaje / 100);
      const retorno = precioEntrada > 0 
        ? ((resistencia.precio - precioEntrada) / precioEntrada) * 100
        : 0;
      const gananciaUSD = cantidadUSDT * (retorno / 100);
      
      return {
        nivel: idx + 1,
        precio: resistencia.precio,
        tipo: resistencia.tipo,
        nombre: resistencia.esConfluencia ? `Confluencia (${resistencia.indicadores?.length || 1})` : resistencia.nombre,
        timeframe: resistencia.timeframe,
        toques: resistencia.toques,
        porcentaje,
        cantidadUSDT: Math.round(cantidadUSDT),
        gananciaUSD: Math.round(gananciaUSD),
        retorno,
        razon: resistencia.razon,
        // Pass confluence data
        indicadores: resistencia.indicadores,
        esConfluencia: resistencia.esConfluencia
      };
    });
  
  const totalGanancia = ordenes.reduce((sum, o) => sum + o.gananciaUSD, 0);
  const porcentajeTotal = ordenes.reduce((sum, o) => sum + o.porcentaje, 0);
  
  return {
    estrategia,
    ordenes,
    totalGanancia,
    porcentajeTotal,
    isExitStrategy: false
  };
}
