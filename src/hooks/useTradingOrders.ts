import { useMemo, useRef } from 'react';
import { NivelSoporte } from '@/lib/technicalAnalysis';

export interface OrdenCompra {
  nivel: number;
  precio: number;
  tipo: string;
  nombre: string;
  montoUSDT: number;
  btcAmount: number;
  distancia: number;
  score: number;
  razon: string;
}

export interface OrdenVenta {
  nivel: number;
  precio: number;
  tipo: string;
  nombre: string;
  porcentaje: number;
  cantidadUSDT: number;
  gananciaUSD: number;
  retorno: number;
  razon: string;
}

export interface OrdenesCompraResult {
  recomendacion: 'COMPRAR_EN_NIVELES' | 'NO_COMPRAR' | 'ESPERAR';
  razon: string;
  ordenes: OrdenCompra[];
}

export interface OrdenesVentaResult {
  estrategia: 'CONSERVADOR' | 'BALANCEADO' | 'REDUCIR' | 'SALIR';
  ordenes: OrdenVenta[];
  totalGanancia: number;
  porcentajeTotal: number;
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
  shouldRecalculate: boolean = true
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
      resistencias
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

function calcularOrdenesCompra(
  precioActual: number,
  ratio: number,
  soportes: NivelSoporte[],
  usdtDisponibles: number
): OrdenesCompraResult {
  // Don't recommend buying if overvalued
  if (ratio > 1.2) {
    return {
      recomendacion: 'NO_COMPRAR',
      razon: 'Bitcoin sobrevalorado (ratio > 1.2)',
      ordenes: []
    };
  }
  
  if (soportes.length === 0) {
    return {
      recomendacion: 'ESPERAR',
      razon: 'Sin niveles de soporte claros',
      ordenes: []
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
      nombre: soporte.nombre,
      montoUSDT: Math.round(montoUSDT),
      btcAmount,
      distancia: soporte.distancia,
      score: soporte.score,
      razon: soporte.razon
    };
  });
  
  return {
    recomendacion: 'COMPRAR_EN_NIVELES',
    razon: ratio < 0.8 
      ? 'Excelente momento - Bitcoin muy infravalorado'
      : 'Buena oportunidad - Precio cerca de fair value',
    ordenes
  };
}

function calcularOrdenesVenta(
  precioActual: number,
  precioEntrada: number,
  tamañoPosicion: number,
  ratio: number,
  resistencias: NivelSoporte[]
): OrdenesVentaResult {
  // Determine strategy based on ratio
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
        nombre: resistencia.nombre,
        porcentaje,
        cantidadUSDT: Math.round(cantidadUSDT),
        gananciaUSD: Math.round(gananciaUSD),
        retorno,
        razon: resistencia.razon
      };
    });
  
  const totalGanancia = ordenes.reduce((sum, o) => sum + o.gananciaUSD, 0);
  const porcentajeTotal = ordenes.reduce((sum, o) => sum + o.porcentaje, 0);
  
  return {
    estrategia,
    ordenes,
    totalGanancia,
    porcentajeTotal
  };
}
