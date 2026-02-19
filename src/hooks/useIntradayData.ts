import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { EMA, RSI, MACD, OBV } from 'technicalindicators';
import { useAssetTicker } from './useAssetTicker';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type IntradayAsset = 'BTC' | 'ETH' | 'BNB';
export type IntradayTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type HiddenTimeframe = '1w';
export type AllTimeframes = IntradayTimeframe | HiddenTimeframe;

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

export interface IntradayRSI {
  current: number | null;    // RSI(14) current value
  previous: number | null;   // RSI(14) previous value (for divergence)
  values: number[];
}

export interface IntradayMACD {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  previousHistogram: number | null;  // For histogram flip detection
}

export interface IntradayVolume {
  obv: number | null;           // On-Balance Volume (current)
  obvPrevious: number | null;   // OBV previous (for trend)
  volumeMA: number | null;      // 20-period volume SMA
  currentVolume: number;        // Latest candle volume
  volumeRatio: number | null;   // currentVolume / volumeMA (>1 = above average)
}

export interface IntradayData {
  candles: IntradayCandle[];
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  emas: IntradayEMAs;
  rsi: IntradayRSI;
  macd: IntradayMACD;
  volume: IntradayVolume;
  volatility: number; // Percentage
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BINANCE_API = 'https://api.binance.com';

const ASSET_SYMBOLS: Record<IntradayAsset, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT'
};

const TIMEFRAME_INTERVALS: Record<AllTimeframes, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w'
};

const CANDLE_LIMITS: Record<AllTimeframes, number> = {
  '1m': 200,
  '5m': 150,
  '15m': 100,
  '1h': 100,
  '4h': 100,
  '1d': 90,
  '1w': 52
};

// Step 2: Staggered refetch intervals per timeframe
const REFETCH_INTERVALS: Record<AllTimeframes, number> = {
  '1m': 15_000,   // 15s
  '5m': 30_000,   // 30s
  '15m': 60_000,  // 1min
  '1h': 120_000,  // 2min
  '4h': 300_000,  // 5min
  '1d': 600_000,  // 10min
  '1w': 600_000,  // 10min
};

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchKlines(
  asset: IntradayAsset,
  timeframe: AllTimeframes,
  limit?: number
): Promise<IntradayCandle[]> {
  const symbol = ASSET_SYMBOLS[asset];
  const interval = TIMEFRAME_INTERVALS[timeframe];
  const candleLimit = limit ?? CANDLE_LIMITS[timeframe];

  logger.log(`[useIntradayData] Fetching ${asset} ${timeframe} klines (${candleLimit})...`);

  const url = `${BINANCE_API}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${candleLimit}`;
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

  logger.log(`[useIntradayData] Retrieved ${candles.length} candles`);
  return candles;
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
// RSI CALCULATION
// ============================================================================

function calculateRSI(candles: IntradayCandle[]): IntradayRSI {
  const closePrices = candles.map(c => c.close);
  const rsiValues = RSI.calculate({ period: 14, values: closePrices });

  return {
    current: rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null,
    previous: rsiValues.length > 1 ? rsiValues[rsiValues.length - 2] : null,
    values: rsiValues,
  };
}

// ============================================================================
// MACD CALCULATION
// ============================================================================

function calculateMACD(candles: IntradayCandle[]): IntradayMACD {
  const closePrices = candles.map(c => c.close);
  const macdResult = MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (macdResult.length === 0) {
    return { macd: null, signal: null, histogram: null, previousHistogram: null };
  }

  const last = macdResult[macdResult.length - 1];
  const prev = macdResult.length > 1 ? macdResult[macdResult.length - 2] : null;

  return {
    macd: last.MACD ?? null,
    signal: last.signal ?? null,
    histogram: last.histogram ?? null,
    previousHistogram: prev?.histogram ?? null,
  };
}

// ============================================================================
// VOLUME ANALYSIS
// ============================================================================

function calculateVolumeAnalysis(candles: IntradayCandle[]): IntradayVolume {
  const volumes = candles.map(c => c.volume);
  const closePrices = candles.map(c => c.close);
  const currentVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;

  // OBV calculation
  const obvValues = OBV.calculate({ close: closePrices, volume: volumes });
  const obv = obvValues.length > 0 ? obvValues[obvValues.length - 1] : null;
  const obvPrevious = obvValues.length > 1 ? obvValues[obvValues.length - 2] : null;

  // Volume SMA(20)
  let volumeMA: number | null = null;
  if (volumes.length >= 20) {
    const last20 = volumes.slice(-20);
    volumeMA = last20.reduce((s, v) => s + v, 0) / 20;
  }

  const volumeRatio = volumeMA && volumeMA > 0 ? currentVolume / volumeMA : null;

  return { obv, obvPrevious, volumeMA, currentVolume, volumeRatio };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useIntradayData(
  asset: IntradayAsset = 'BTC',
  timeframe: AllTimeframes = '15m',
  enabled: boolean = true
) {
  // Step 1: Use centralized ticker (shared across timeframes for the same asset)
  const { data: tickerData } = useAssetTicker(asset, enabled);

  const refetchInterval = REFETCH_INTERVALS[timeframe];

  const queryResult = useQuery<IntradayData>({
    queryKey: ['intraday-data', asset, timeframe],
    queryFn: async () => {
      logger.log(`[useIntradayData] Starting fetch for ${asset} ${timeframe}...`);

      // Only fetch klines - ticker comes from useAssetTicker
      const candles = await fetchKlines(asset, timeframe);

      const emas = calculateEMAs(candles);
      const rsi = calculateRSI(candles);
      const macd = calculateMACD(candles);
      const volumeAnalysis = calculateVolumeAnalysis(candles);
      const volatility = calculateVolatility(candles);

      // Use shared ticker data, fall back to last candle close
      const price = tickerData?.price ?? candles[candles.length - 1]?.close ?? 0;
      const change24h = tickerData?.change24h ?? 0;
      const high24h = tickerData?.high24h ?? 0;
      const low24h = tickerData?.low24h ?? 0;
      const volume24h = tickerData?.volume24h ?? 0;

      logger.log(`[useIntradayData] Data ready:`, {
        price,
        change: `${change24h.toFixed(2)}%`,
        volatility: `${volatility.toFixed(2)}%`,
        ema9: emas.ema9?.toFixed(2),
        rsi: rsi.current?.toFixed(1),
        macdHist: macd.histogram?.toFixed(2),
      });

      return {
        candles,
        currentPrice: price,
        change24h,
        high24h,
        low24h,
        volume24h,
        emas,
        rsi,
        macd,
        volume: volumeAnalysis,
        volatility,
        timestamp: Date.now()
      };
    },
    staleTime: refetchInterval,
    refetchInterval,
    enabled,
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
