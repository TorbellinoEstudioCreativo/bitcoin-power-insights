import { useQuery } from '@tanstack/react-query';
import { 
  fetchDerivativesData, 
  DerivativesData, 
  getLastValidDerivativesData 
} from '@/lib/derivatives';

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useDerivatives() {
  const cachedData = getLastValidDerivativesData();
  
  return useQuery<DerivativesData>({
    queryKey: ['derivatives-data'],
    queryFn: fetchDerivativesData,
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: cachedData ?? undefined,
    refetchOnWindowFocus: false,
    throwOnError: false
  });
}
