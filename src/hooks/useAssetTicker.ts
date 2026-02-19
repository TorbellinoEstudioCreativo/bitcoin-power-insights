import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type TickerAsset = 'BTC' | 'ETH' | 'BNB';

export interface AssetTickerData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BINANCE_API = 'https://api.binance.com';

const ASSET_SYMBOLS: Record<TickerAsset, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
};

// ============================================================================
// FETCH
// ============================================================================

async function fetchTicker(asset: TickerAsset): Promise<AssetTickerData> {
  const symbol = ASSET_SYMBOLS[asset];
  const url = `${BINANCE_API}/api/v3/ticker/24hr?symbol=${symbol}`;

  logger.log(`[useAssetTicker] Fetching ticker for ${asset}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    price: parseFloat(data.lastPrice),
    change24h: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
  };
}

// ============================================================================
// HOOK - One query per asset, shared across all timeframes
// ============================================================================

export function useAssetTicker(asset: TickerAsset, enabled: boolean = true) {
  return useQuery<AssetTickerData>({
    queryKey: ['ticker', asset],
    queryFn: () => fetchTicker(asset),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
