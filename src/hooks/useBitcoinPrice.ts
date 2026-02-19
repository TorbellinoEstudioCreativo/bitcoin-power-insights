import { useQuery } from '@tanstack/react-query';
import { useBinanceWebSocket } from './useBinanceWebSocket';
import { logger } from '@/lib/logger';

export interface BitcoinPriceData {
  price: number;
  change24h: number | null;
  isLive: boolean;
}

const BINANCE_API = 'https://api.binance.com';
const FALLBACK_PRICE = 96000;
const CACHE_KEY = 'btc-price-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Cache helpers
function getCachedPrice(): BitcoinPriceData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    logger.log(`[useBitcoinPrice] Using cached price (age: ${Math.round(age / 1000 / 60)} min)`);
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedPrice(data: BitcoinPriceData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore cache errors
  }
}

async function fetchBitcoinPrice(): Promise<BitcoinPriceData> {
  logger.log('[useBitcoinPrice] Fetching from Binance HTTP...');

  try {
    const url = `${BINANCE_API}/api/v3/ticker/24hr?symbol=BTCUSDT`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const result: BitcoinPriceData = {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      isLive: true
    };

    logger.log('[useBitcoinPrice] HTTP Success:', {
      price: result.price.toFixed(2),
      change24h: `${result.change24h?.toFixed(2)}%`
    });

    // Cache successful result
    setCachedPrice(result);

    return result;
  } catch (error) {
    logger.error('[useBitcoinPrice] HTTP Error:', error);

    // Try cache fallback
    const cached = getCachedPrice();
    if (cached) {
      logger.log('[useBitcoinPrice] Using cached data');
      return { ...cached, isLive: false };
    }

    // Last resort fallback
    logger.log('[useBitcoinPrice] Using fallback price');
    return {
      price: FALLBACK_PRICE,
      change24h: null,
      isLive: false
    };
  }
}

export function useBitcoinPrice() {
  // WebSocket for real-time updates (<1s latency)
  const { data: wsData, isConnected: wsConnected } = useBinanceWebSocket('btcusdt');

  // HTTP polling as fallback (only when WebSocket is down)
  const httpQuery = useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    staleTime: 30_000,
    refetchInterval: wsConnected ? false : 30_000, // Disable polling when WS is active
    retry: 2,
    placeholderData: {
      price: FALLBACK_PRICE,
      change24h: null,
      isLive: false
    },
  });

  // Prefer WebSocket data when available
  if (wsData && wsConnected) {
    return {
      ...httpQuery,
      data: {
        price: wsData.price,
        change24h: wsData.change24h,
        isLive: true,
      } as BitcoinPriceData,
    };
  }

  return httpQuery;
}
