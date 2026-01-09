import { useMemo } from 'react';
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

export function useTradingOrders(
  precioActual: number,
  ratio: number,
  soportes: NivelSoporte[],
  resistencias: NivelSoporte[],
  inputs: TradingInputs
) {
  return useMemo(() => {
    const ordenesCompra = calcularOrdenesCompra(
      precioActual,
      ratio,
      soportes,
      inputs.usdtDisponibles
    );
    
    const ordenesVenta = calcularOrdenesVenta(
      precioActual,
      inputs.precioEntrada,
      inputs.tamañoPosicion,
      ratio,
      resistencias
    );
    
    return { ordenesCompra, ordenesVenta };
  }, [precioActual, ratio, soportes, resistencias, inputs]);
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
