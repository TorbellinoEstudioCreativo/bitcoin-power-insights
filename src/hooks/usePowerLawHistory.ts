import { useQuery } from '@tanstack/react-query';
import { fetchBinanceKlines, CandleData } from '@/lib/historicalData';
import { logger } from '@/lib/logger';

export interface DailyPrice {
  timestamp: number;
  date: Date;
  close: number;
}

export function usePowerLawHistory() {
  const query = useQuery({
    queryKey: ['binance-klines-1d-365'],
    queryFn: async () => {
      logger.log('[usePowerLawHistory] Fetching 365 daily candles from Binance...');
      const candles = await fetchBinanceKlines('BTCUSDT', '1d', 365);
      logger.log(`[usePowerLawHistory] Got ${candles.length} candles`);
      return candles;
    },
    staleTime: 10 * 60 * 1000,       // Fresh for 10 minutes
    refetchInterval: 15 * 60 * 1000,  // Refetch every 15 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const dailyPrices: DailyPrice[] = (query.data || []).map((c: CandleData) => ({
    timestamp: c.timestamp,
    date: new Date(c.timestamp),
    close: c.close,
  }));

  return {
    dailyPrices,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
