import { useMemo } from 'react';
import {
  calcularEMA,
  generarPreciosSimulados,
  detectarSoportes,
  detectarResistencias,
  detectarPivotesSoporte,
  detectarPivotesResistencia,
  fusionarNiveles,
  EMAs,
  NivelSoporte,
} from '@/lib/technicalAnalysis';
import { suavizarNiveles } from '@/lib/levelSmoothing';
import { PowerLawAnalysis } from './usePowerLawAnalysis';
import { useHistoricalData } from './useHistoricalData';

export interface TechnicalAnalysisResult {
  emas: EMAs;
  soportes: NivelSoporte[];
  resistencias: NivelSoporte[];
  isLoadingHistorical: boolean;
  usingRealData: boolean;
}

export function useTechnicalAnalysis(
  btcPrice: number,
  analysis: PowerLawAnalysis
): TechnicalAnalysisResult {
  // Fetch real historical data from CoinGecko
  const { historicalData, ohlcData, isLoading } = useHistoricalData();
  
  return useMemo(() => {
    // Use REAL historical prices if available, fallback to simulated
    const preciosHistoricos = historicalData?.prices && historicalData.prices.length >= 200
      ? historicalData.prices
      : generarPreciosSimulados(btcPrice, 250);
    
    const usingRealData = !!(historicalData?.prices && historicalData.prices.length >= 200);
    
    if (usingRealData) {
      console.log('[TechnicalAnalysis] Using REAL historical data from CoinGecko');
    } else {
      console.log('[TechnicalAnalysis] Using simulated data (fallback)');
    }
    
    // Calculate all EMAs from real/simulated prices
    const emas: EMAs = {
      ema25: calcularEMA(preciosHistoricos, 25),
      ema55: calcularEMA(preciosHistoricos, 55),
      ema99: calcularEMA(preciosHistoricos, 99),
      ema200: calcularEMA(preciosHistoricos, 200),
    };
    
    // Detect EMA-based support and resistance levels
    const soportesEMA = detectarSoportes(btcPrice, emas, analysis.piso);
    const resistenciasEMA = detectarResistencias(
      btcPrice, 
      emas, 
      analysis.techo, 
      analysis.precioModelo
    );
    
    // Detect REAL pivot levels from OHLC data if available
    let soportesPivot: NivelSoporte[] = [];
    let resistenciasPivot: NivelSoporte[] = [];
    
    if (ohlcData && ohlcData.length > 20) {
      soportesPivot = detectarPivotesSoporte(ohlcData, btcPrice);
      resistenciasPivot = detectarPivotesResistencia(ohlcData, btcPrice);
      console.log(`[TechnicalAnalysis] Detected ${soportesPivot.length} pivot supports, ${resistenciasPivot.length} pivot resistances`);
    }
    
    // Merge EMA levels with pivot levels
    const soportesCombinados = fusionarNiveles([...soportesEMA, ...soportesPivot], btcPrice);
    const resistenciasCombinadas = fusionarNiveles([...resistenciasEMA, ...resistenciasPivot], btcPrice);
    
    // Sort and limit to top levels
    const soportesOrdenados = soportesCombinados
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);
    
    const resistenciasOrdenadas = resistenciasCombinadas
      .sort((a, b) => a.precio - b.precio) // Nearest first
      .slice(0, 7);
    
    // Apply smoothing to prevent UI flickering
    const soportes = suavizarNiveles(soportesOrdenados, 'soportes');
    const resistencias = suavizarNiveles(resistenciasOrdenadas, 'resistencias');
    
    return { 
      emas, 
      soportes, 
      resistencias, 
      isLoadingHistorical: isLoading,
      usingRealData 
    };
  }, [btcPrice, analysis.piso, analysis.techo, analysis.precioModelo, historicalData, ohlcData, isLoading]);
}
