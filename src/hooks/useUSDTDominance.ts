import { useQuery } from '@tanstack/react-query';
import { fetchUSDTDominance, USDTDominanceData, defaultUSDTDominanceData } from '@/lib/usdtDominance';
import { useBitcoinPrice } from './useBitcoinPrice';

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useUSDTDominance() {
  // Obtener datos de BTC para correlación
  const { data: btcData } = useBitcoinPrice();
  
  return useQuery<USDTDominanceData>({
    queryKey: ['usdt-dominance', btcData?.change24h],
    queryFn: () => fetchUSDTDominance(btcData?.change24h ?? undefined),
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: (previousData) => previousData ?? defaultUSDTDominanceData,
    // Mantener datos anteriores mientras se reintenta
    refetchOnWindowFocus: false
  });
}
