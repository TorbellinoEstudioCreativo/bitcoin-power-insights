import { useMemo } from 'react';
import { useIntradayData, IntradayAsset, IntradayTimeframe, IntradayData } from './useIntradayData';
import { useDerivatives } from './useDerivatives';
import { 
  rankSignals, 
  generateTradeSetup, 
  SignalScore, 
  TradeSetup 
} from '@/lib/tradeRecommender';
import { 
  getDirectionFromEMAs, 
  getEMAAlignment,
  generateMultiTFRecommendation,
  getValidationTimeframes,
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

// We now monitor ALL assets and ALL timeframes for proper ranking
const MONITORED_COMBINATIONS: Array<{ asset: IntradayAsset; timeframe: IntradayTimeframe }> = [
  // BTC - all timeframes
  { asset: 'BTC', timeframe: '1m' },
  { asset: 'BTC', timeframe: '5m' },
  { asset: 'BTC', timeframe: '15m' },
  { asset: 'BTC', timeframe: '1h' },
  { asset: 'BTC', timeframe: '4h' },
  { asset: 'BTC', timeframe: '1d' },
  // ETH - all timeframes
  { asset: 'ETH', timeframe: '1m' },
  { asset: 'ETH', timeframe: '5m' },
  { asset: 'ETH', timeframe: '15m' },
  { asset: 'ETH', timeframe: '1h' },
  { asset: 'ETH', timeframe: '4h' },
  { asset: 'ETH', timeframe: '1d' },
  // BNB - all timeframes
  { asset: 'BNB', timeframe: '1m' },
  { asset: 'BNB', timeframe: '5m' },
  { asset: 'BNB', timeframe: '15m' },
  { asset: 'BNB', timeframe: '1h' },
  { asset: 'BNB', timeframe: '4h' },
  { asset: 'BNB', timeframe: '1d' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateQuickConfidence(data: IntradayData | null): number {
  if (!data) return 50;
  
  const { emas, change24h } = data;
  let confidence = 50;
  
  // EMA alignment bonus
  if (emas.ema9 && emas.ema21 && emas.ema50) {
    const bullish = emas.ema9 > emas.ema21 && emas.ema21 > emas.ema50;
    const bearish = emas.ema9 < emas.ema21 && emas.ema21 < emas.ema50;
    if (bullish || bearish) confidence += 20;
  }
  
  // Momentum bonus
  if (Math.abs(change24h) > 2) confidence += 10;
  
  return Math.min(90, confidence);
}

function calculateSignalWithConfluence(
  data: IntradayData,
  timeframe: IntradayTimeframe,
  validationData: Map<string, IntradayData | null>
): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; confluenceScore: number } {
  const { emas } = data;
  
  // Get base direction from EMAs
  const direction = getDirectionFromEMAs(emas.ema9, emas.ema21, emas.ema50);
  const alignment = getEMAAlignment(emas.ema9, emas.ema21, emas.ema50);
  
  // Base confidence
  let confidence = calculateQuickConfidence(data);
  
  // Get validation timeframes from matrix
  const { lower, upper } = getValidationTimeframes(timeframe);
  const validationTFs = [...lower, ...upper];
  
  // Build adjacent signals for confluence
  const adjacentSignals: TimeframeSignal[] = [];
  
  validationTFs.forEach(tf => {
    const tfData = validationData.get(tf);
    if (tfData) {
      const tfDirection = getDirectionFromEMAs(tfData.emas.ema9, tfData.emas.ema21, tfData.emas.ema50);
      const tfAlignment = getEMAAlignment(tfData.emas.ema9, tfData.emas.ema21, tfData.emas.ema50);
      
      adjacentSignals.push({
        timeframe: tf,
        direction: tfDirection,
        confidence: calculateQuickConfidence(tfData),
        emaAlignment: tfAlignment
      });
    }
  });
  
  // Calculate confluence if we have adjacent signals
  let confluenceScore = 50;
  
  if (adjacentSignals.length > 0 && direction !== 'NEUTRAL') {
    const currentSignal: TimeframeSignal = {
      timeframe,
      direction,
      confidence,
      emaAlignment: alignment
    };
    
    const result = generateMultiTFRecommendation(currentSignal, adjacentSignals);
    confidence = result.adjustedConfidence;
    confluenceScore = result.confluenceScore;
  }
  
  return { direction, confidence, confluenceScore };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAllSignals(): AllSignalsResult {
  // Fetch derivatives data (shared across all assets)
  const { data: derivativesData, isLoading: isLoadingDerivatives } = useDerivatives();
  
  // Fetch data for all monitored combinations
  // Using fixed hook calls to respect React rules
  // BTC - all timeframes
  const btc1m = useIntradayData('BTC', '1m');
  const btc5m = useIntradayData('BTC', '5m');
  const btc15m = useIntradayData('BTC', '15m');
  const btc1h = useIntradayData('BTC', '1h');
  const btc4h = useIntradayData('BTC', '4h');
  const btc1d = useIntradayData('BTC', '1d');
  
  // ETH - all timeframes
  const eth1m = useIntradayData('ETH', '1m');
  const eth5m = useIntradayData('ETH', '5m');
  const eth15m = useIntradayData('ETH', '15m');
  const eth1h = useIntradayData('ETH', '1h');
  const eth4h = useIntradayData('ETH', '4h');
  const eth1d = useIntradayData('ETH', '1d');
  
  // BNB - all timeframes
  const bnb1m = useIntradayData('BNB', '1m');
  const bnb5m = useIntradayData('BNB', '5m');
  const bnb15m = useIntradayData('BNB', '15m');
  const bnb1h = useIntradayData('BNB', '1h');
  const bnb4h = useIntradayData('BNB', '4h');
  const bnb1d = useIntradayData('BNB', '1d');
  
  // Build data map
  const dataMap = useMemo(() => {
    const map = new Map<string, { data: IntradayData | null; isLoading: boolean }>();
    
    // BTC - all timeframes
    map.set('BTC-1m', { data: btc1m.data ?? null, isLoading: btc1m.isLoading });
    map.set('BTC-5m', { data: btc5m.data ?? null, isLoading: btc5m.isLoading });
    map.set('BTC-15m', { data: btc15m.data ?? null, isLoading: btc15m.isLoading });
    map.set('BTC-1h', { data: btc1h.data ?? null, isLoading: btc1h.isLoading });
    map.set('BTC-4h', { data: btc4h.data ?? null, isLoading: btc4h.isLoading });
    map.set('BTC-1d', { data: btc1d.data ?? null, isLoading: btc1d.isLoading });
    
    // ETH - all timeframes
    map.set('ETH-1m', { data: eth1m.data ?? null, isLoading: eth1m.isLoading });
    map.set('ETH-5m', { data: eth5m.data ?? null, isLoading: eth5m.isLoading });
    map.set('ETH-15m', { data: eth15m.data ?? null, isLoading: eth15m.isLoading });
    map.set('ETH-1h', { data: eth1h.data ?? null, isLoading: eth1h.isLoading });
    map.set('ETH-4h', { data: eth4h.data ?? null, isLoading: eth4h.isLoading });
    map.set('ETH-1d', { data: eth1d.data ?? null, isLoading: eth1d.isLoading });
    
    // BNB - all timeframes
    map.set('BNB-1m', { data: bnb1m.data ?? null, isLoading: bnb1m.isLoading });
    map.set('BNB-5m', { data: bnb5m.data ?? null, isLoading: bnb5m.isLoading });
    map.set('BNB-15m', { data: bnb15m.data ?? null, isLoading: bnb15m.isLoading });
    map.set('BNB-1h', { data: bnb1h.data ?? null, isLoading: bnb1h.isLoading });
    map.set('BNB-4h', { data: bnb4h.data ?? null, isLoading: bnb4h.isLoading });
    map.set('BNB-1d', { data: bnb1d.data ?? null, isLoading: bnb1d.isLoading });
    
    return map;
  }, [
    btc1m.data, btc1m.isLoading,
    btc5m.data, btc5m.isLoading,
    btc15m.data, btc15m.isLoading,
    btc1h.data, btc1h.isLoading,
    btc4h.data, btc4h.isLoading,
    btc1d.data, btc1d.isLoading,
    eth1m.data, eth1m.isLoading,
    eth5m.data, eth5m.isLoading,
    eth15m.data, eth15m.isLoading,
    eth1h.data, eth1h.isLoading,
    eth4h.data, eth4h.isLoading,
    eth1d.data, eth1d.isLoading,
    bnb1m.data, bnb1m.isLoading,
    bnb5m.data, bnb5m.isLoading,
    bnb15m.data, bnb15m.isLoading,
    bnb1h.data, bnb1h.isLoading,
    bnb4h.data, bnb4h.isLoading,
    bnb1d.data, bnb1d.isLoading,
  ]);
  
  // Build validation data map for each asset (all have all TFs now)
  const validationDataMaps = useMemo(() => {
    const maps: Record<IntradayAsset, Map<string, IntradayData | null>> = {
      BTC: new Map(),
      ETH: new Map(),
      BNB: new Map()
    };
    
    const allTFs = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    // All assets now have all timeframes
    allTFs.forEach(tf => {
      maps.BTC.set(tf, dataMap.get(`BTC-${tf}`)?.data ?? null);
      maps.ETH.set(tf, dataMap.get(`ETH-${tf}`)?.data ?? null);
      maps.BNB.set(tf, dataMap.get(`BNB-${tf}`)?.data ?? null);
    });
    
    return maps;
  }, [dataMap]);
  
  // Calculate OI change from derivatives
  const oiChange = derivativesData?.openInterest?.change24h ?? 0;
  
  // Calculate top signals with error handling
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
            validationDataMaps[asset]
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
      console.error('[useAllSignals] Error ranking signals:', error);
      return [];
    }
  }, [dataMap, validationDataMaps, oiChange]);
  
  // Check if any data is still loading
  const isLoading = useMemo(() => {
    for (const [, entry] of dataMap) {
      if (entry.isLoading) return true;
    }
    return isLoadingDerivatives;
  }, [dataMap, isLoadingDerivatives]);
  
  // Function to generate trade setup for a selected signal
  const getTradeSetup = useMemo(() => {
    return (signal: SignalScore): TradeSetup | null => {
      const key = `${signal.asset}-${signal.timeframe}`;
      const entry = dataMap.get(key);
      
      if (!entry?.data) return null;
      
      const currentPrice = entry.data.currentPrice;
      
      // Calculate TP levels
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
  
  return {
    topSignals,
    isLoading,
    getTradeSetup
  };
}
