import { useQuery } from '@tanstack/react-query';
import { 
  fetchLiquidationHistory, 
  fetchLongShortRatio,
  clusterLiquidations,
  findNearbyZones,
  calculateSmartSL,
  type CoinglassLiquidationData
} from '@/lib/coinglass';
import type { IntradayAsset } from '@/hooks/useIntradayData';

const ASSET_MAP: Record<IntradayAsset, string> = {
  BTC: 'BTC',
  ETH: 'ETH',
  BNB: 'BNB'
};

export function useRealLiquidations(
  asset: IntradayAsset,
  currentPrice: number,
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
) {
  return useQuery<CoinglassLiquidationData | null>({
    queryKey: ['real-liquidations', asset],
    queryFn: async () => {
      console.log('[useRealLiquidations] Fetching for', asset, 'at price', currentPrice);
      
      const symbol = ASSET_MAP[asset];
      
      try {
        // 1. Fetch historical liquidations (24h window)
        const [liquidations, longShortRatio] = await Promise.all([
          fetchLiquidationHistory(symbol, '24h'),
          fetchLongShortRatio(symbol).catch(() => null)
        ]);
        
        if (!liquidations || liquidations.length === 0) {
          console.warn('[useRealLiquidations] No liquidation data returned');
          return null;
        }
        
        // 2. Cluster liquidations by price ranges ($100 step for BTC, adjust for others)
        const priceStep = asset === 'BTC' ? 100 : asset === 'ETH' ? 10 : 1;
        const clusters = clusterLiquidations(liquidations, priceStep);
        
        // 3. Find zones near current price
        const { above, below, critical } = findNearbyZones(clusters, currentPrice, 5);
        
        console.log('[useRealLiquidations] ✅ Processed:', {
          totalLiquidations: liquidations.length,
          totalClusters: clusters.length,
          nearbyAbove: above.length,
          nearbyBelow: below.length,
          criticalZone: critical ? `$${critical.priceRange.avg.toFixed(0)}` : 'none'
        });
        
        return {
          liquidations,
          clusters,
          zonesAbove: above,
          zonesBelow: below,
          criticalZone: critical,
          longShortRatio,
          timestamp: Date.now()
        };
        
      } catch (error) {
        console.error('[useRealLiquidations] Error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,        // 5 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes cache
    refetchInterval: 5 * 60 * 1000,  // Refetch every 5 minutes
    enabled: !!currentPrice && currentPrice > 0,
    retry: 2
  });
}

/**
 * Hook to get calculated SL from real data
 */
export function useSmartStopLoss(
  asset: IntradayAsset,
  currentPrice: number,
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
) {
  const { data, isLoading, error } = useRealLiquidations(asset, currentPrice, direction);
  
  if (!data || direction === 'NEUTRAL') {
    return { smartSL: null, isLoading, error };
  }
  
  const smartSL = calculateSmartSL(direction, currentPrice, data.clusters);
  
  return { smartSL, isLoading, error };
}
