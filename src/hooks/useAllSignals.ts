import { useMemo } from 'react';
import { useIntradayData, IntradayAsset, IntradayTimeframe, AllTimeframes, IntradayData } from './useIntradayData';
import { useDerivatives } from './useDerivatives';
import { logger } from '@/lib/logger';
import { calculateSignal } from '@/lib/signalEngine';
import {
  rankSignals,
  generateTradeSetup,
  SignalScore,
  TradeSetup
} from '@/lib/tradeRecommender';
import {
  getEMAAlignment,
  generateMultiTFRecommendation,
  getSequentialAdjacentTFs,
  TimeframeSignal
} from '@/lib/multiTimeframeAnalysis';
import { calculateIntradayTPs } from '@/lib/intradayCalculations';

// ============================================================================
// TYPES
// ============================================================================

export interface AllSignalsResult {
  topSignals: SignalScore[];
  isLoading: boolean;
  getTradeSetup: (signal: SignalScore) => TradeSetup | null;
}

// ============================================================================
// STRATEGIC SIGNAL COMBINATIONS
// ============================================================================

const MONITORED_COMBINATIONS: Array<{ asset: IntradayAsset; timeframe: IntradayTimeframe }> = [
  // BTC
  { asset: 'BTC', timeframe: '1m' },
  { asset: 'BTC', timeframe: '5m' },
  { asset: 'BTC', timeframe: '15m' },
  { asset: 'BTC', timeframe: '1h' },
  { asset: 'BTC', timeframe: '4h' },
  { asset: 'BTC', timeframe: '1d' },
  // ETH
  { asset: 'ETH', timeframe: '1m' },
  { asset: 'ETH', timeframe: '5m' },
  { asset: 'ETH', timeframe: '15m' },
  { asset: 'ETH', timeframe: '1h' },
  { asset: 'ETH', timeframe: '4h' },
  { asset: 'ETH', timeframe: '1d' },
  // BNB
  { asset: 'BNB', timeframe: '1m' },
  { asset: 'BNB', timeframe: '5m' },
  { asset: 'BNB', timeframe: '15m' },
  { asset: 'BNB', timeframe: '1h' },
  { asset: 'BNB', timeframe: '4h' },
  { asset: 'BNB', timeframe: '1d' },
];

// ============================================================================
// UNIFIED SIGNAL CALCULATION (uses the same engine as useIntradaySignal)
// ============================================================================

function calculateSignalWithConfluence(
  data: IntradayData,
  timeframe: IntradayTimeframe,
  derivativesData: any,
  allTFData: Map<string, IntradayData | null>
): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; confluenceScore: number } {
  // Use the SAME signal engine as the main view
  const result = calculateSignal(data, derivativesData, timeframe);

  let { direction, confidence } = result;

  // Apply multi-TF confluence using the same approach as useIntradaySignal
  const { previous, next } = getSequentialAdjacentTFs(timeframe);
  const adjacentTFSignals: TimeframeSignal[] = [];

  [previous, next].forEach(tf => {
    if (!tf) return;
    const tfData = allTFData.get(tf);
    if (!tfData) return;

    // Use signal engine for adjacent TF too (same as main view)
    const adjResult = calculateSignal(tfData, derivativesData, tf as IntradayTimeframe);
    const emaAlignment = getEMAAlignment(tfData.emas.ema9, tfData.emas.ema21, tfData.emas.ema50);

    adjacentTFSignals.push({
      timeframe: tf,
      direction: adjResult.direction,
      confidence: adjResult.confidence,
      emaAlignment
    });
  });

  let confluenceScore = 0;

  if (adjacentTFSignals.length > 0 && direction !== 'NEUTRAL') {
    const emaAlignment = getEMAAlignment(data.emas.ema9, data.emas.ema21, data.emas.ema50);
    const currentSignal: TimeframeSignal = {
      timeframe,
      direction,
      confidence,
      emaAlignment
    };

    const confluenceResult = generateMultiTFRecommendation(currentSignal, adjacentTFSignals);
    confidence = confluenceResult.adjustedConfidence;
    confluenceScore = confluenceResult.confluenceScore;
  }

  return { direction, confidence, confluenceScore };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAllSignals(enabled: boolean = true): AllSignalsResult {
  const { data: derivativesData, isLoading: isLoadingDerivatives } = useDerivatives();

  // BTC
  const btc1m = useIntradayData('BTC', '1m', enabled);
  const btc5m = useIntradayData('BTC', '5m', enabled);
  const btc15m = useIntradayData('BTC', '15m', enabled);
  const btc1h = useIntradayData('BTC', '1h', enabled);
  const btc4h = useIntradayData('BTC', '4h', enabled);
  const btc1d = useIntradayData('BTC', '1d', enabled);

  // ETH
  const eth1m = useIntradayData('ETH', '1m', enabled);
  const eth5m = useIntradayData('ETH', '5m', enabled);
  const eth15m = useIntradayData('ETH', '15m', enabled);
  const eth1h = useIntradayData('ETH', '1h', enabled);
  const eth4h = useIntradayData('ETH', '4h', enabled);
  const eth1d = useIntradayData('ETH', '1d', enabled);

  // BNB
  const bnb1m = useIntradayData('BNB', '1m', enabled);
  const bnb5m = useIntradayData('BNB', '5m', enabled);
  const bnb15m = useIntradayData('BNB', '15m', enabled);
  const bnb1h = useIntradayData('BNB', '1h', enabled);
  const bnb4h = useIntradayData('BNB', '4h', enabled);
  const bnb1d = useIntradayData('BNB', '1d', enabled);

  const dataMap = useMemo(() => {
    const map = new Map<string, { data: IntradayData | null; isLoading: boolean }>();

    map.set('BTC-1m', { data: btc1m.data ?? null, isLoading: btc1m.isLoading });
    map.set('BTC-5m', { data: btc5m.data ?? null, isLoading: btc5m.isLoading });
    map.set('BTC-15m', { data: btc15m.data ?? null, isLoading: btc15m.isLoading });
    map.set('BTC-1h', { data: btc1h.data ?? null, isLoading: btc1h.isLoading });
    map.set('BTC-4h', { data: btc4h.data ?? null, isLoading: btc4h.isLoading });
    map.set('BTC-1d', { data: btc1d.data ?? null, isLoading: btc1d.isLoading });

    map.set('ETH-1m', { data: eth1m.data ?? null, isLoading: eth1m.isLoading });
    map.set('ETH-5m', { data: eth5m.data ?? null, isLoading: eth5m.isLoading });
    map.set('ETH-15m', { data: eth15m.data ?? null, isLoading: eth15m.isLoading });
    map.set('ETH-1h', { data: eth1h.data ?? null, isLoading: eth1h.isLoading });
    map.set('ETH-4h', { data: eth4h.data ?? null, isLoading: eth4h.isLoading });
    map.set('ETH-1d', { data: eth1d.data ?? null, isLoading: eth1d.isLoading });

    map.set('BNB-1m', { data: bnb1m.data ?? null, isLoading: bnb1m.isLoading });
    map.set('BNB-5m', { data: bnb5m.data ?? null, isLoading: bnb5m.isLoading });
    map.set('BNB-15m', { data: bnb15m.data ?? null, isLoading: bnb15m.isLoading });
    map.set('BNB-1h', { data: bnb1h.data ?? null, isLoading: bnb1h.isLoading });
    map.set('BNB-4h', { data: bnb4h.data ?? null, isLoading: bnb4h.isLoading });
    map.set('BNB-1d', { data: bnb1d.data ?? null, isLoading: bnb1d.isLoading });

    return map;
  }, [
    btc1m.data, btc1m.isLoading, btc5m.data, btc5m.isLoading,
    btc15m.data, btc15m.isLoading, btc1h.data, btc1h.isLoading,
    btc4h.data, btc4h.isLoading, btc1d.data, btc1d.isLoading,
    eth1m.data, eth1m.isLoading, eth5m.data, eth5m.isLoading,
    eth15m.data, eth15m.isLoading, eth1h.data, eth1h.isLoading,
    eth4h.data, eth4h.isLoading, eth1d.data, eth1d.isLoading,
    bnb1m.data, bnb1m.isLoading, bnb5m.data, bnb5m.isLoading,
    bnb15m.data, bnb15m.isLoading, bnb1h.data, bnb1h.isLoading,
    bnb4h.data, bnb4h.isLoading, bnb1d.data, bnb1d.isLoading,
  ]);

  // Build per-asset TF maps for confluence lookup
  const assetTFMaps = useMemo(() => {
    const maps: Record<IntradayAsset, Map<string, IntradayData | null>> = {
      BTC: new Map(), ETH: new Map(), BNB: new Map()
    };
    const allTFs = ['1m', '5m', '15m', '1h', '4h', '1d'];
    allTFs.forEach(tf => {
      maps.BTC.set(tf, dataMap.get(`BTC-${tf}`)?.data ?? null);
      maps.ETH.set(tf, dataMap.get(`ETH-${tf}`)?.data ?? null);
      maps.BNB.set(tf, dataMap.get(`BNB-${tf}`)?.data ?? null);
    });
    return maps;
  }, [dataMap]);

  const oiChange = derivativesData?.openInterest?.change24h ?? 0;

  const topSignals = useMemo(() => {
    try {
      const signals: Array<{
        asset: IntradayAsset;
        timeframe: IntradayTimeframe;
        direction: 'LONG' | 'SHORT' | 'NEUTRAL';
        confidence: number;
        confluenceScore: number;
        volatility: number;
        oiChange: number;
      }> = [];

      MONITORED_COMBINATIONS.forEach(({ asset, timeframe }) => {
        const key = `${asset}-${timeframe}`;
        const entry = dataMap.get(key);

        if (entry?.data) {
          const { direction, confidence, confluenceScore } = calculateSignalWithConfluence(
            entry.data,
            timeframe,
            derivativesData,
            assetTFMaps[asset]
          );

          signals.push({
            asset,
            timeframe,
            direction,
            confidence,
            confluenceScore,
            volatility: entry.data.volatility ?? 50,
            oiChange
          });
        }
      });

      return rankSignals(signals);
    } catch (error) {
      logger.error('[useAllSignals] Error ranking signals:', error);
      return [];
    }
  }, [dataMap, assetTFMaps, derivativesData, oiChange]);

  const isLoading = useMemo(() => {
    for (const [, entry] of dataMap) {
      if (entry.isLoading) return true;
    }
    return isLoadingDerivatives;
  }, [dataMap, isLoadingDerivatives]);

  const getTradeSetup = useMemo(() => {
    return (signal: SignalScore): TradeSetup | null => {
      const key = `${signal.asset}-${signal.timeframe}`;
      const entry = dataMap.get(key);
      if (!entry?.data) return null;

      const currentPrice = entry.data.currentPrice;
      const tpLevels = calculateIntradayTPs(
        currentPrice,
        signal.direction,
        signal.timeframe,
        entry.data.candles?.map(c => ({ high: c.high, low: c.low, close: c.close }))
      );

      return generateTradeSetup(
        signal,
        currentPrice,
        tpLevels.stopLoss,
        [tpLevels.tp1, tpLevels.tp2, tpLevels.tp3],
        entry.data.volatility ?? 50,
        oiChange
      );
    };
  }, [dataMap, oiChange]);

  return { topSignals, isLoading, getTradeSetup };
}
