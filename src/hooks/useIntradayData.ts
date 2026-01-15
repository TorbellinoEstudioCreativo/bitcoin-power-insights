import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { EMA } from 'technicalindicators';

// ============================================================================
// TYPES
// ============================================================================

export type IntradayAsset = 'BTC' | 'ETH' | 'BNB';
export type IntradayTimeframe = '5m' | '15m' | '30m' | '1h' | '4h';

export interface IntradayCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IntradayEMAs {
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  ema9Values: number[];
  ema21Values: number[];
  ema50Values: number[];
}

export interface IntradayData {
  candles: IntradayCandle[];
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  emas: IntradayEMAs;
  volatility: number; // Percentage
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BINANCE_API = 'https://api.binance.com';
const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

const ASSET_SYMBOLS: Record<IntradayAsset, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT'
};

const TIMEFRAME_INTERVALS: Record<IntradayTimeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h'
};

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchKlines(
  asset: IntradayAsset,
  timeframe: IntradayTimeframe,
  limit: number = 100
): Promise<IntradayCandle[]> {
  const symbol = ASSET_SYMBOLS[asset];
  const interval = TIMEFRAME_INTERVALS[timeframe];
  
  console.log(`[useIntradayData] Fetching ${asset} ${timeframe} klines...`);
  
  const url = `${BINANCE_API}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  const candles: IntradayCandle[] = data.map((kline: any[]) => ({
    timestamp: kline[0],
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5])
  }));
  
  console.log(`[useIntradayData] ✅ Retrieved ${candles.length} candles`);
  return candles;
}

async function fetch24hTicker(asset: IntradayAsset): Promise<{
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}> {
  const symbol = ASSET_SYMBOLS[asset];
  const url = `${BINANCE_API}/api/v3/ticker/24hr?symbol=${symbol}`;
  
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
    volume24h: parseFloat(data.volume)
  };
}

// ============================================================================
// EMA CALCULATION
// ============================================================================

function calculateEMAs(candles: IntradayCandle[]): IntradayEMAs {
  const closePrices = candles.map(c => c.close);
  
  const ema9Values = EMA.calculate({ period: 9, values: closePrices });
  const ema21Values = EMA.calculate({ period: 21, values: closePrices });
  const ema50Values = EMA.calculate({ period: 50, values: closePrices });
  
  // Pad arrays to match candle length
  const padArray = (arr: number[], targetLength: number): number[] => {
    const padding = new Array(targetLength - arr.length).fill(NaN);
    return [...padding, ...arr];
  };
  
  return {
    ema9: ema9Values.length > 0 ? ema9Values[ema9Values.length - 1] : null,
    ema21: ema21Values.length > 0 ? ema21Values[ema21Values.length - 1] : null,
    ema50: ema50Values.length > 0 ? ema50Values[ema50Values.length - 1] : null,
    ema9Values: padArray(ema9Values, closePrices.length),
    ema21Values: padArray(ema21Values, closePrices.length),
    ema50Values: padArray(ema50Values, closePrices.length)
  };
}

// ============================================================================
// VOLATILITY CALCULATION
// ============================================================================

function calculateVolatility(candles: IntradayCandle[]): number {
  if (candles.length < 2) return 0;
  
  // Calculate average true range (ATR) as volatility proxy
  let totalRange = 0;
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    totalRange += trueRange;
  }
  
  const avgTrueRange = totalRange / (candles.length - 1);
  const currentPrice = candles[candles.length - 1].close;
  
  // Return as percentage
  return (avgTrueRange / currentPrice) * 100;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useIntradayData(
  asset: IntradayAsset = 'BTC',
  timeframe: IntradayTimeframe = '15m'
) {
  const queryResult = useQuery<IntradayData>({
    queryKey: ['intraday-data', asset, timeframe],
    queryFn: async () => {
      console.log(`[useIntradayData] Starting fetch for ${asset} ${timeframe}...`);
      
      const [candles, ticker] = await Promise.all([
        fetchKlines(asset, timeframe, 100),
        fetch24hTicker(asset)
      ]);
      
      const emas = calculateEMAs(candles);
      const volatility = calculateVolatility(candles);
      
      console.log(`[useIntradayData] ✅ Data ready:`, {
        price: ticker.price,
        change: `${ticker.change24h.toFixed(2)}%`,
        volatility: `${volatility.toFixed(2)}%`,
        ema9: emas.ema9?.toFixed(2),
        ema21: emas.ema21?.toFixed(2),
        ema50: emas.ema50?.toFixed(2)
      });
      
      return {
        candles,
        currentPrice: ticker.price,
        change24h: ticker.change24h,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        volume24h: ticker.volume24h,
        emas,
        volatility,
        timestamp: Date.now()
      };
    },
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Memoized analysis
  const analysis = useMemo(() => {
    if (!queryResult.data) return null;
    
    const { emas, currentPrice, volatility } = queryResult.data;
    
    // Trend analysis based on EMAs
    const isBullish = 
      emas.ema9 !== null && 
      emas.ema21 !== null && 
      emas.ema50 !== null &&
      emas.ema9 > emas.ema21 && 
      emas.ema21 > emas.ema50;
    
    const isBearish = 
      emas.ema9 !== null && 
      emas.ema21 !== null && 
      emas.ema50 !== null &&
      emas.ema9 < emas.ema21 && 
      emas.ema21 < emas.ema50;
    
    // Volatility level
    const volatilityLevel: 'Alta' | 'Media' | 'Baja' = 
      volatility > 1.5 ? 'Alta' : volatility > 0.8 ? 'Media' : 'Baja';
    
    return {
      trend: isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral',
      volatilityLevel,
      priceAboveEma9: emas.ema9 !== null && currentPrice > emas.ema9,
      priceAboveEma21: emas.ema21 !== null && currentPrice > emas.ema21,
      priceAboveEma50: emas.ema50 !== null && currentPrice > emas.ema50
    };
  }, [queryResult.data]);

  return {
    ...queryResult,
    analysis
  };
}
