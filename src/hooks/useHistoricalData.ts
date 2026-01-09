import { useQuery } from '@tanstack/react-query';
import { 
  fetchBinanceKlines, 
  fetchHistoricalPrices, 
  fetchOHLC, 
  HistoricalDataResult, 
  CandleData 
} from '@/lib/historicalData';

export interface UseHistoricalDataResult {
  historicalData: HistoricalDataResult | undefined;
  ohlcData: CandleData[] | undefined;
  isLoading: boolean;
  error: Error | null;
  source: 'Binance' | 'CoinGecko' | 'None';
}

export function useHistoricalData(): UseHistoricalDataResult {
  // PRIMARY: Fetch from Binance (250 daily candles for EMA200)
  const binanceQuery = useQuery({
    queryKey: ['binance-klines-1d'],
    queryFn: () => fetchBinanceKlines('BTCUSDT', '1d', 250),
    staleTime: 5 * 60 * 1000,        // Fresh for 5 minutes
    refetchInterval: 10 * 60 * 1000,  // Refetch every 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  // FALLBACK: CoinGecko if Binance fails
  const coingeckoQuery = useQuery({
    queryKey: ['btc-historical-prices'],
    queryFn: fetchHistoricalPrices,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: binanceQuery.isError, // Only fetch if Binance fails
  });
  
  // FALLBACK: CoinGecko OHLC if Binance fails (for pivot detection)
  const ohlcQuery = useQuery({
    queryKey: ['btc-ohlc-90'],
    queryFn: () => fetchOHLC(90),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: binanceQuery.isError, // Only fetch if Binance fails
  });
  
  // Determine data source and format result
  if (binanceQuery.data && binanceQuery.data.length > 0) {
    // Using Binance data (preferred)
    const prices = binanceQuery.data.map(c => c.close);
    
    return {
      historicalData: {
        prices,
        candles: binanceQuery.data,
        lastUpdated: Date.now()
      },
      ohlcData: binanceQuery.data, // Binance gives us full OHLC
      isLoading: binanceQuery.isLoading,
      error: null,
      source: 'Binance'
    };
  }
  
  if (coingeckoQuery.data) {
    // Fallback to CoinGecko
    return {
      historicalData: coingeckoQuery.data,
      ohlcData: ohlcQuery.data,
      isLoading: coingeckoQuery.isLoading || ohlcQuery.isLoading,
      error: (coingeckoQuery.error || ohlcQuery.error) as Error | null,
      source: 'CoinGecko'
    };
  }
  
  // Still loading or no data
  return {
    historicalData: undefined,
    ohlcData: undefined,
    isLoading: binanceQuery.isLoading || coingeckoQuery.isLoading,
    error: (binanceQuery.error || coingeckoQuery.error) as Error | null,
    source: 'None'
  };
}
