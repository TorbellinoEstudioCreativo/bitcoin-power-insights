import { useQuery } from '@tanstack/react-query';
import { fetchBinanceKlines, CandleData } from '@/lib/historicalData';
import { logger } from '@/lib/logger';

export interface HistoricalDataResult {
  prices: number[];
  candles: CandleData[];
  lastUpdated: number;
}

export interface UseHistoricalDataResult {
  historicalData: HistoricalDataResult | undefined;
  ohlcData: CandleData[] | undefined;
  isLoading: boolean;
  error: Error | null;
  source: 'Binance' | 'Cache' | 'None';
}

export function useHistoricalData(): UseHistoricalDataResult {
  // Fetch from Binance (250 daily candles for EMA200)
  const binanceQuery = useQuery({
    queryKey: ['binance-klines-1d'],
    queryFn: async () => {
      logger.log('[useHistoricalData] Fetching from Binance...');
      try {
        const candles = await fetchBinanceKlines('BTCUSDT', '1d', 250);
        logger.log(`[useHistoricalData] ✅ Retrieved ${candles.length} candles from Binance`);
        return candles;
      } catch (error) {
        logger.error('[useHistoricalData] ❌ Error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,        // Fresh for 5 minutes
    refetchInterval: 10 * 60 * 1000,  // Refetch every 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  // Determine data source
  if (binanceQuery.data && binanceQuery.data.length > 0) {
    const prices = binanceQuery.data.map(c => c.close);
    
    return {
      historicalData: {
        prices,
        candles: binanceQuery.data,
        lastUpdated: Date.now()
      },
      ohlcData: binanceQuery.data,
      isLoading: false,
      error: null,
      source: 'Binance'
    };
  }
  
  // Loading or error state
  return {
    historicalData: undefined,
    ohlcData: undefined,
    isLoading: binanceQuery.isLoading,
    error: binanceQuery.error as Error | null,
    source: 'None'
  };
}
