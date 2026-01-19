// ============================================================================
// COINGLASS API CLIENT - Real Liquidation Data
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface HistoricalLiquidation {
  price: number;
  timestamp: number;
  volume: number;           // $ in millions
  side: 'long' | 'short';
  leverage: 'low' | 'medium' | 'high';
}

export interface LiquidationCluster {
  priceRange: {
    min: number;
    max: number;
    avg: number;
  };
  totalVolume: number;      // $ total liquidated
  longVolume: number;       // $ longs liquidated
  shortVolume: number;      // $ shorts liquidated
  dominantSide: 'long' | 'short';
  leverageProfile: 'low' | 'medium' | 'high';
  lastOccurrence: number;   // timestamp
  significance: 'critical' | 'high' | 'medium' | 'low';
}

export interface LongShortRatio {
  longPercent: number;
  shortPercent: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  exchanges: Array<{
    name: string;
    longPercent: number;
    shortPercent: number;
  }>;
}

export interface CoinglassLiquidationData {
  liquidations: HistoricalLiquidation[];
  clusters: LiquidationCluster[];
  zonesAbove: LiquidationCluster[];
  zonesBelow: LiquidationCluster[];
  criticalZone: LiquidationCluster | null;
  longShortRatio: LongShortRatio | null;
  timestamp: number;
}

// ============================================================================
// API CALLS VIA EDGE FUNCTION
// ============================================================================

async function callCoinglassProxy(endpoint: string, params: Record<string, string | number>) {
  console.log('[Coinglass] Calling proxy:', endpoint, params);
  
  const { data, error } = await supabase.functions.invoke('coinglass-proxy', {
    body: { endpoint, params }
  });
  
  if (error) {
    console.error('[Coinglass] Proxy error:', error);
    throw new Error(`Coinglass proxy error: ${error.message}`);
  }
  
  if (data?.error) {
    console.error('[Coinglass] API error:', data.error);
    throw new Error(`Coinglass API error: ${data.message || data.error}`);
  }
  
  return data;
}

/**
 * Fetch historical liquidations from Coinglass
 */
export async function fetchLiquidationHistory(
  symbol: string,
  timeType: '1h' | '4h' | '12h' | '24h' = '24h'
): Promise<HistoricalLiquidation[]> {
  console.log('[Coinglass] Fetching liquidation history for', symbol, timeType);
  
  try {
    const result = await callCoinglassProxy('/api/futures/liquidation/history', {
      symbol: symbol.toUpperCase(),
      timeType
    });
    
    // Transform API response to our format
    // Coinglass returns data in various formats, handle accordingly
    const rawData = result.data || [];
    
    const liquidations: HistoricalLiquidation[] = [];
    
    if (Array.isArray(rawData)) {
      rawData.forEach((item: Record<string, unknown>) => {
        // Handle aggregated data format
        if (item.longLiquidationUsd || item.shortLiquidationUsd) {
          const price = Number(item.price) || 0;
          const longVol = Number(item.longLiquidationUsd) || 0;
          const shortVol = Number(item.shortLiquidationUsd) || 0;
          const timestamp = Number(item.createTime) || Number(item.time) || Date.now();
          
          if (longVol > 0) {
            liquidations.push({
              price,
              timestamp,
              volume: longVol / 1_000_000,
              side: 'long',
              leverage: classifyLeverage(20)
            });
          }
          if (shortVol > 0) {
            liquidations.push({
              price,
              timestamp,
              volume: shortVol / 1_000_000,
              side: 'short',
              leverage: classifyLeverage(20)
            });
          }
        } else {
          // Handle individual liquidation format
          liquidations.push({
            price: Number(item.price) || 0,
            timestamp: Number(item.time) || Number(item.createTime) || Date.now(),
            volume: (Number(item.volume) || Number(item.usd) || 0) / 1_000_000,
            side: (item.side === 'sell' || item.type === 1) ? 'long' : 'short',
            leverage: classifyLeverage(Number(item.leverage) || 20)
          });
        }
      });
    }
    
    console.log('[Coinglass] ✅ Retrieved', liquidations.length, 'liquidation events');
    return liquidations;
    
  } catch (error) {
    console.error('[Coinglass] ❌ Error fetching liquidation history:', error);
    throw error;
  }
}

/**
 * Fetch long/short ratio from Coinglass
 */
export async function fetchLongShortRatio(symbol: string): Promise<LongShortRatio> {
  console.log('[Coinglass] Fetching long/short ratio for', symbol);
  
  try {
    const result = await callCoinglassProxy('/api/futures/longShort/globalAccount', {
      symbol: symbol.toUpperCase()
    });
    
    const rawData = result.data || [];
    
    // Calculate aggregate average
    let totalLong = 0;
    let count = 0;
    const exchanges: LongShortRatio['exchanges'] = [];
    
    if (Array.isArray(rawData)) {
      rawData.forEach((item: Record<string, unknown>) => {
        const longPercent = Number(item.longRate) || Number(item.longPercent) || 50;
        totalLong += longPercent;
        count++;
        
        exchanges.push({
          name: String(item.exchangeName || item.exchange || 'Unknown'),
          longPercent,
          shortPercent: 100 - longPercent
        });
      });
    }
    
    const avgLong = count > 0 ? totalLong / count : 50;
    const avgShort = 100 - avgLong;
    
    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgLong > 55) trend = 'bullish';
    else if (avgShort > 55) trend = 'bearish';
    
    const ratio: LongShortRatio = {
      longPercent: avgLong,
      shortPercent: avgShort,
      trend,
      exchanges
    };
    
    console.log('[Coinglass] ✅ Long/Short:', `${avgLong.toFixed(1)}% / ${avgShort.toFixed(1)}%`);
    return ratio;
    
  } catch (error) {
    console.error('[Coinglass] ❌ Error fetching long/short ratio:', error);
    throw error;
  }
}

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

function classifyLeverage(leverage: number): 'low' | 'medium' | 'high' {
  if (leverage >= 50) return 'high';
  if (leverage >= 20) return 'medium';
  return 'low';
}

/**
 * Group liquidations into price clusters
 */
export function clusterLiquidations(
  liquidations: HistoricalLiquidation[],
  priceStep: number = 100
): LiquidationCluster[] {
  if (!liquidations.length) return [];
  
  const clusters = new Map<number, {
    prices: number[];
    totalVolume: number;
    longVolume: number;
    shortVolume: number;
    timestamps: number[];
    leverages: string[];
  }>();
  
  // Group by price ranges
  liquidations.forEach(liq => {
    if (liq.price <= 0) return;
    
    const priceKey = Math.round(liq.price / priceStep) * priceStep;
    
    if (!clusters.has(priceKey)) {
      clusters.set(priceKey, {
        prices: [],
        totalVolume: 0,
        longVolume: 0,
        shortVolume: 0,
        timestamps: [],
        leverages: []
      });
    }
    
    const cluster = clusters.get(priceKey)!;
    cluster.prices.push(liq.price);
    cluster.totalVolume += liq.volume;
    cluster.timestamps.push(liq.timestamp);
    cluster.leverages.push(liq.leverage);
    
    if (liq.side === 'long') {
      cluster.longVolume += liq.volume;
    } else {
      cluster.shortVolume += liq.volume;
    }
  });
  
  // Convert to LiquidationCluster format
  const result: LiquidationCluster[] = Array.from(clusters.entries()).map(([, data]) => {
    const minPrice = Math.min(...data.prices);
    const maxPrice = Math.max(...data.prices);
    const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;
    
    const dominantSide = data.longVolume > data.shortVolume ? 'long' : 'short';
    
    // Determine leverage profile
    const leverageCounts = { low: 0, medium: 0, high: 0 };
    data.leverages.forEach(lev => leverageCounts[lev as keyof typeof leverageCounts]++);
    const leverageProfile = Object.entries(leverageCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as 'low' | 'medium' | 'high';
    
    // Determine significance
    let significance: 'critical' | 'high' | 'medium' | 'low';
    if (data.totalVolume > 100) significance = 'critical';
    else if (data.totalVolume > 50) significance = 'high';
    else if (data.totalVolume > 20) significance = 'medium';
    else significance = 'low';
    
    return {
      priceRange: { min: minPrice, max: maxPrice, avg: avgPrice },
      totalVolume: data.totalVolume,
      longVolume: data.longVolume,
      shortVolume: data.shortVolume,
      dominantSide,
      leverageProfile,
      lastOccurrence: Math.max(...data.timestamps),
      significance
    };
  });
  
  // Sort by total volume (most significant first)
  return result.sort((a, b) => b.totalVolume - a.totalVolume);
}

/**
 * Find liquidation clusters near current price
 */
export function findNearbyZones(
  clusters: LiquidationCluster[],
  currentPrice: number,
  maxDistancePercent: number = 5
): {
  above: LiquidationCluster[];
  below: LiquidationCluster[];
  critical: LiquidationCluster | null;
} {
  const maxDistance = currentPrice * (maxDistancePercent / 100);
  
  const above = clusters
    .filter(c => c.priceRange.avg > currentPrice && 
                 c.priceRange.avg - currentPrice <= maxDistance)
    .sort((a, b) => a.priceRange.avg - b.priceRange.avg);
  
  const below = clusters
    .filter(c => c.priceRange.avg < currentPrice && 
                 currentPrice - c.priceRange.avg <= maxDistance)
    .sort((a, b) => b.priceRange.avg - a.priceRange.avg);
  
  // Find most critical nearby zone
  const allNearby = [...above, ...below];
  const critical = allNearby.length > 0
    ? allNearby.reduce((prev, curr) => 
        curr.significance === 'critical' ? curr :
        prev.significance === 'critical' ? prev :
        curr.totalVolume > prev.totalVolume ? curr : prev
      )
    : null;
  
  return { above, below, critical };
}

/**
 * Calculate intelligent stop-loss based on liquidation zones
 */
export function calculateSmartSL(
  direction: 'LONG' | 'SHORT',
  currentPrice: number,
  clusters: LiquidationCluster[]
): {
  price: number;
  distancePercent: number;
  reason: string;
} {
  const { above, below } = findNearbyZones(clusters, currentPrice, 5);
  
  if (direction === 'LONG') {
    const criticalBelow = below.find(c => 
      c.significance === 'critical' || c.significance === 'high'
    );
    
    if (criticalBelow) {
      const slPrice = criticalBelow.priceRange.min * 0.995;
      const distance = ((currentPrice - slPrice) / currentPrice) * 100;
      
      return {
        price: slPrice,
        distancePercent: distance,
        reason: `Debajo de cluster en $${criticalBelow.priceRange.avg.toFixed(0)} (${criticalBelow.totalVolume.toFixed(0)}M liq.)`
      };
    }
  } else {
    const criticalAbove = above.find(c => 
      c.significance === 'critical' || c.significance === 'high'
    );
    
    if (criticalAbove) {
      const slPrice = criticalAbove.priceRange.max * 1.005;
      const distance = ((slPrice - currentPrice) / currentPrice) * 100;
      
      return {
        price: slPrice,
        distancePercent: distance,
        reason: `Arriba de cluster en $${criticalAbove.priceRange.avg.toFixed(0)} (${criticalAbove.totalVolume.toFixed(0)}M liq.)`
      };
    }
  }
  
  // Fallback
  const fallbackDistance = 2.5;
  const slPrice = direction === 'LONG' 
    ? currentPrice * (1 - fallbackDistance / 100)
    : currentPrice * (1 + fallbackDistance / 100);
  
  return {
    price: slPrice,
    distancePercent: fallbackDistance,
    reason: 'Distancia estándar (sin clusters críticos)'
  };
}
