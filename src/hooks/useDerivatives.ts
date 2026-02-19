import { useQuery } from '@tanstack/react-query';
import {
  fetchDerivativesData,
  DerivativesData,
  getLastValidDerivativesData,
  formatOpenInterest,
  formatFundingRate
} from '@/lib/derivatives';
import { logger } from '@/lib/logger';

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useDerivatives() {
  const cachedData = getLastValidDerivativesData();
  
  return useQuery<DerivativesData>({
    queryKey: ['derivatives-data'],
    queryFn: async () => {
      logger.log('[useDerivatives] Starting fetch...');
      try {
        const data = await fetchDerivativesData();
        logger.log('[useDerivatives] ✅ Fetch successful:', {
          oi: formatOpenInterest(data.openInterest.openInterestUsd),
          funding: formatFundingRate(data.fundingRate.fundingRatePercent)
        });
        return data;
      } catch (error) {
        logger.error('[useDerivatives] ❌ Fetch failed:', error);
        throw error;
      }
    },
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: cachedData ?? undefined,
    refetchOnWindowFocus: false,
    throwOnError: false
  });
}
