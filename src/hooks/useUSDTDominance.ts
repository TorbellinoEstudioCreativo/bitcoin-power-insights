import { useQuery } from '@tanstack/react-query';
import { fetchUSDTDominance, USDTDominanceData, defaultUSDTDominanceData, getLastValidData } from '@/lib/usdtDominance';
import { useBitcoinPrice } from './useBitcoinPrice';

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useUSDTDominance() {
  // Obtener datos de BTC para correlación
  const { data: btcData } = useBitcoinPrice();
  
  // Intentar obtener datos cacheados como fallback inicial
  const cachedData = getLastValidData();
  
  return useQuery<USDTDominanceData>({
    queryKey: ['usdt-dominance', btcData?.change24h],
    queryFn: () => fetchUSDTDominance(btcData?.change24h ?? undefined),
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    // Usar datos cacheados si existen, sino el default
    placeholderData: (previousData) => previousData ?? cachedData ?? defaultUSDTDominanceData,
    // Mantener datos anteriores mientras se reintenta
    refetchOnWindowFocus: false,
    // No marcar como error si tenemos datos en caché
    throwOnError: false
  });
}
