import { useQuery } from '@tanstack/react-query';
import { fetchUSDTDominance, USDTDominanceData } from '@/lib/usdtDominance';

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useUSDTDominance() {
  return useQuery<USDTDominanceData>({
    queryKey: ['usdt-dominance'],
    queryFn: fetchUSDTDominance,
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
    // Fallback data para evitar errores iniciales
    placeholderData: {
      dominance: 4.5,  // Valor típico histórico
      trend: 'neutral' as const,
      change: 0,
      usdtMarketCap: 0,
      totalMarketCap: 0,
      timestamp: 0
    }
  });
}
