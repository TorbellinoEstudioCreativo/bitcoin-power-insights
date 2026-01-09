import { useMemo } from 'react';
import {
  calcularEMA,
  generarPreciosSimulados,
  detectarSoportes,
  detectarResistencias,
  EMAs,
  NivelSoporte,
} from '@/lib/technicalAnalysis';
import { PowerLawAnalysis } from './usePowerLawAnalysis';

export interface TechnicalAnalysisResult {
  emas: EMAs;
  soportes: NivelSoporte[];
  resistencias: NivelSoporte[];
}

export function useTechnicalAnalysis(
  btcPrice: number,
  analysis: PowerLawAnalysis
): TechnicalAnalysisResult {
  return useMemo(() => {
    // Generate simulated historical prices for EMA calculation
    // In production, this would connect to a real API
    const preciosHistoricos = generarPreciosSimulados(btcPrice, 250);
    
    // Calculate all EMAs
    const emas: EMAs = {
      ema25: calcularEMA(preciosHistoricos, 25),
      ema55: calcularEMA(preciosHistoricos, 55),
      ema99: calcularEMA(preciosHistoricos, 99),
      ema200: calcularEMA(preciosHistoricos, 200),
    };
    
    // Detect support and resistance levels
    const soportes = detectarSoportes(btcPrice, emas, analysis.piso);
    const resistencias = detectarResistencias(
      btcPrice, 
      emas, 
      analysis.techo, 
      analysis.precioModelo
    );
    
    return { emas, soportes, resistencias };
  }, [btcPrice, analysis.piso, analysis.techo, analysis.precioModelo]);
}
