import { useQuery } from '@tanstack/react-query';

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
    
    console.log(`[useBitcoinPrice] Using cached price (age: ${Math.round(age / 1000 / 60)} min)`);
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
  console.log('[useBitcoinPrice] Fetching from Binance...');
  
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
    
    console.log('[useBitcoinPrice] ✅ Success:', {
      price: result.price.toFixed(2),
      change24h: `${result.change24h?.toFixed(2)}%`
    });
    
    // Cache successful result
    setCachedPrice(result);
    
    return result;
  } catch (error) {
    console.error('[useBitcoinPrice] ❌ Error:', error);
    
    // Try cache fallback
    const cached = getCachedPrice();
    if (cached) {
      console.log('[useBitcoinPrice] ⚠️ Using cached data');
      return { ...cached, isLive: false };
    }
    
    // Last resort fallback
    console.log('[useBitcoinPrice] ⚠️ Using fallback price');
    return {
      price: FALLBACK_PRICE,
      change24h: null,
      isLive: false
    };
  }
}

export function useBitcoinPrice() {
  return useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    staleTime: 30 * 1000,        // Fresh for 30 seconds
    refetchInterval: 30 * 1000,  // Refetch every 30 seconds
    retry: 2,
    placeholderData: {
      price: FALLBACK_PRICE,
      change24h: null,
      isLive: false
    },
  });
}
