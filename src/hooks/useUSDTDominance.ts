import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
    
    // CRÍTICO: Mantener datos anteriores SIEMPRE, nunca perder último dato válido
    placeholderData: (previousData) => {
      // Prioridad: previousData > cachedData > default
      return previousData ?? cachedData ?? defaultUSDTDominanceData;
    },
    
    refetchOnWindowFocus: false,
    throwOnError: false,
    
    // Seleccionar datos: si el fetch retorna undefined, usar cache
    select: (data) => data ?? cachedData ?? defaultUSDTDominanceData
  });
}
