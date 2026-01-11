import { useMemo } from 'react';
import {
  calcularTodasEMAs,
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
  dataSource: 'Binance' | 'CoinGecko' | 'Simulated';
}

export function useTechnicalAnalysis(
  btcPrice: number,
  analysis: PowerLawAnalysis
): TechnicalAnalysisResult {
  // Fetch real historical data (Binance preferred, CoinGecko fallback)
  const { historicalData, ohlcData, isLoading, source } = useHistoricalData();
  
  return useMemo(() => {
    // Use REAL historical prices if available, fallback to simulated
    const preciosHistoricos = historicalData?.prices && historicalData.prices.length >= 200
      ? historicalData.prices
      : generarPreciosSimulados(btcPrice, 250);
    
    const usingRealData = !!(historicalData?.prices && historicalData.prices.length >= 200);
    const dataSource: 'Binance' | 'CoinGecko' | 'Simulated' = usingRealData 
      ? (source === 'None' ? 'Simulated' : source) 
      : 'Simulated';
    
    // Calculate all EMAs using the technicalindicators library
    const emas = calcularTodasEMAs(preciosHistoricos);
    
    // ===== DEBUG: Verify EMAs match TradingView/Binance =====
    console.log(`[TechnicalAnalysis] Data source: ${dataSource}`);
    console.log(`[TechnicalAnalysis] Prices available: ${preciosHistoricos.length}`);
    console.log('[TechnicalAnalysis] EMAs calculated (verify in Binance/TradingView):');
    console.log(`  EMA25:  $${emas.ema25.toFixed(2)}`);
    console.log(`  EMA55:  $${emas.ema55.toFixed(2)}`);
    console.log(`  EMA99:  $${emas.ema99.toFixed(2)}`);
    console.log(`  EMA200: $${emas.ema200.toFixed(2)}`);
    console.log(`  Current price: $${btcPrice.toFixed(2)}`);
    
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
    const soportesSuavizados = suavizarNiveles(soportesOrdenados, 'soportes');
    const resistenciasSuavizadas = suavizarNiveles(resistenciasOrdenadas, 'resistencias');

    // FINAL deduplication (post-smoothing): remove any duplicates within 1%
    // This catches duplicates reintroduced by smoothing history.
    const soportes = soportesSuavizados.filter((nivel, idx, arr) => {
      const firstMatch = arr.findIndex(n =>
        Math.abs(n.precio - nivel.precio) / Math.max(n.precio, nivel.precio) < 0.01
      );
      return firstMatch === idx;
    });

    const resistencias = resistenciasSuavizadas.filter((nivel, idx, arr) => {
      const firstMatch = arr.findIndex(n =>
        Math.abs(n.precio - nivel.precio) / Math.max(n.precio, nivel.precio) < 0.01
      );
      return firstMatch === idx;
    });

    return { 
      emas, 
      soportes, 
      resistencias, 
      isLoadingHistorical: isLoading,
      usingRealData,
      dataSource
    };
  }, [btcPrice, analysis.piso, analysis.techo, analysis.precioModelo, historicalData, ohlcData, isLoading, source]);
}
