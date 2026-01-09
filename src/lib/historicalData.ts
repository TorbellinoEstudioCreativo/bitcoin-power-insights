// Historical Data utilities - Fetch real data from CoinGecko

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataResult {
  prices: number[];
  candles: CandleData[];
  lastUpdated: number;
}

// Cache keys and TTL
const CACHE_KEY_PRICES = 'btc-historical-prices';
const CACHE_KEY_OHLC = 'btc-ohlc-data';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get cached data if valid
function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    if (now - parsed.lastUpdated < CACHE_TTL) {
      return parsed.data as T;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Save data to cache
function saveToCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      lastUpdated: Date.now()
    }));
  } catch {
    // Ignore cache errors
  }
}

// Fetch historical prices from CoinGecko market_chart (365 days daily)
export async function fetchHistoricalPrices(): Promise<HistoricalDataResult> {
  // Check cache first
  const cached = getCachedData<HistoricalDataResult>(CACHE_KEY_PRICES);
  if (cached) {
    console.log('[HistoricalData] Using cached historical prices');
    return cached;
  }
  
  console.log('[HistoricalData] Fetching historical prices from CoinGecko...');
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily',
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert to structured format
    const candles: CandleData[] = data.prices.map((price: [number, number], idx: number) => ({
      timestamp: price[0],
      close: price[1],
      open: price[1],  // market_chart only provides close prices
      high: price[1],
      low: price[1],
      volume: data.total_volumes?.[idx]?.[1] || 0
    }));
    
    const result: HistoricalDataResult = {
      prices: candles.map(c => c.close),
      candles,
      lastUpdated: Date.now()
    };
    
    // Save to cache
    saveToCache(CACHE_KEY_PRICES, result);
    console.log(`[HistoricalData] Fetched ${result.prices.length} daily prices`);
    
    return result;
  } catch (error) {
    console.error('[HistoricalData] Error fetching historical prices:', error);
    throw error;
  }
}

// Fetch OHLC data from CoinGecko (for more accurate pivot detection)
// Returns 4h candles for last 90 days or daily for 365 days depending on 'days' param
export async function fetchOHLC(days: number = 90): Promise<CandleData[]> {
  const cacheKey = `${CACHE_KEY_OHLC}-${days}`;
  
  // Check cache first
  const cached = getCachedData<CandleData[]>(cacheKey);
  if (cached) {
    console.log('[HistoricalData] Using cached OHLC data');
    return cached;
  }
  
  console.log(`[HistoricalData] Fetching OHLC data (${days} days) from CoinGecko...`);
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=${days}`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko OHLC API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // CoinGecko OHLC format: [timestamp, open, high, low, close]
    const candles: CandleData[] = data.map((candle: number[]) => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: 0 // OHLC endpoint doesn't provide volume
    }));
    
    // Save to cache
    saveToCache(cacheKey, candles);
    console.log(`[HistoricalData] Fetched ${candles.length} OHLC candles`);
    
    return candles;
  } catch (error) {
    console.error('[HistoricalData] Error fetching OHLC:', error);
    throw error;
  }
}

// Calculate timeframe from OHLC candle count and days
export function getOHLCTimeframe(candleCount: number, days: number): '4H' | '1D' | '1W' {
  const candlesPerDay = candleCount / days;
  if (candlesPerDay >= 4) return '4H';
  if (candlesPerDay >= 0.9) return '1D';
  return '1W';
}
