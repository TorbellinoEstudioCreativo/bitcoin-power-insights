import { useQuery } from '@tanstack/react-query';
import { fetchHistoricalPrices, fetchOHLC, HistoricalDataResult, CandleData } from '@/lib/historicalData';

export interface UseHistoricalDataResult {
  historicalData: HistoricalDataResult | undefined;
  ohlcData: CandleData[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useHistoricalData(): UseHistoricalDataResult {
  // Fetch 365 days of daily prices for EMA calculation
  const historicalQuery = useQuery({
    queryKey: ['btc-historical-prices'],
    queryFn: fetchHistoricalPrices,
    staleTime: 5 * 60 * 1000,        // Fresh for 5 minutes
    refetchInterval: 10 * 60 * 1000,  // Refetch every 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  // Fetch 90 days of OHLC for pivot detection
  const ohlcQuery = useQuery({
    queryKey: ['btc-ohlc-90'],
    queryFn: () => fetchOHLC(90),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  return {
    historicalData: historicalQuery.data,
    ohlcData: ohlcQuery.data,
    isLoading: historicalQuery.isLoading || ohlcQuery.isLoading,
    error: (historicalQuery.error || ohlcQuery.error) as Error | null
  };
}
