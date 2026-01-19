// ============================================================================
// COINGLASS API CLIENT - Real Liquidation Data (API v3)
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
    console.error('[Coinglass] API error:', data.error, data.message);
    throw new Error(`Coinglass API error: ${data.message || data.error}`);
  }
  
  return data;
}

/**
 * Fetch historical liquidations from Coinglass API v3
 * Endpoint: /api/futures/liquidation/v2/history
 */
export async function fetchLiquidationHistory(
  symbol: string,
  timeType: '1h' | '4h' | '12h' | '24h' = '24h'
): Promise<HistoricalLiquidation[]> {
  console.log('[Coinglass] Fetching liquidation history for', symbol, timeType);
  
  try {
    // v3 API uses different endpoint and parameters
    const result = await callCoinglassProxy('/api/futures/liquidation/v2/history', {
      symbol: symbol.toUpperCase(),
      range: timeType
    });
    
    // v3 returns { code, msg, data } where data is an array
    const rawData = result.data || [];
    
    const liquidations: HistoricalLiquidation[] = [];
    
    if (Array.isArray(rawData)) {
      rawData.forEach((item: Record<string, unknown>) => {
        const price = Number(item.price) || Number(item.markPrice) || 0;
        const timestamp = Number(item.time) || Number(item.createTime) || Date.now();
        
        // v3 format: each entry has longLiquidationUsd and shortLiquidationUsd
        const longVol = Number(item.longLiquidationUsd) || Number(item.buyVol) || 0;
        const shortVol = Number(item.shortLiquidationUsd) || Number(item.sellVol) || 0;
        
        if (longVol > 0 && price > 0) {
          liquidations.push({
            price,
            timestamp,
            volume: longVol / 1_000_000,
            side: 'long',
            leverage: classifyLeverage(20)
          });
        }
        if (shortVol > 0 && price > 0) {
          liquidations.push({
            price,
            timestamp,
            volume: shortVol / 1_000_000,
            side: 'short',
            leverage: classifyLeverage(20)
          });
        }
        
        // Alternative format: single entry with side indicator
        if (!longVol && !shortVol) {
          const vol = Number(item.vol) || Number(item.volUsd) || Number(item.liquidationUsd) || 0;
          const side = item.side === 'buy' || item.side === 1 || item.posSide === 'long' ? 'long' : 'short';
          
          if (vol > 0 && price > 0) {
            liquidations.push({
              price,
              timestamp,
              volume: vol / 1_000_000,
              side,
              leverage: classifyLeverage(Number(item.leverage) || 20)
            });
          }
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
 * Fetch long/short ratio from Coinglass API v3
 * Endpoint: /api/futures/globalLongShortAccountRatio/history
 */
export async function fetchLongShortRatio(symbol: string): Promise<LongShortRatio> {
  console.log('[Coinglass] Fetching long/short ratio for', symbol);
  
  try {
    // v3 uses different endpoint path
    const result = await callCoinglassProxy('/api/futures/globalLongShortAccountRatio/history', {
      symbol: symbol.toUpperCase(),
      interval: 'h4',
      limit: 24
    });
    
    const rawData = result.data || [];
    
    // Calculate aggregate average from recent data
    let totalLong = 0;
    let count = 0;
    const exchanges: LongShortRatio['exchanges'] = [];
    
    if (Array.isArray(rawData)) {
      // Take the most recent entries
      const recentData = rawData.slice(-5);
      
      recentData.forEach((item: Record<string, unknown>) => {
        // v3 format: longAccount, shortAccount, or longRatio
        const longPercent = Number(item.longAccount) || Number(item.longRate) || Number(item.longRatio) * 100 || 50;
        totalLong += Math.min(100, Math.max(0, longPercent));
        count++;
        
        if (item.exchangeName || item.exchange) {
          exchanges.push({
            name: String(item.exchangeName || item.exchange),
            longPercent,
            shortPercent: 100 - longPercent
          });
        }
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
