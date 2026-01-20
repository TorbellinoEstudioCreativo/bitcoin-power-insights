import React, { useState, useMemo } from 'react';
import { useIntradayData, IntradayAsset, IntradayTimeframe, AllTimeframes } from '@/hooks/useIntradayData';
import { useLiquidationPools } from '@/hooks/useLiquidationPools';
import { useIntradaySignal, AdjacentTFData } from '@/hooks/useIntradaySignal';
import { useDerivatives } from '@/hooks/useDerivatives';
import { useAllSignals } from '@/hooks/useAllSignals';
import { getValidationTimeframes } from '@/lib/multiTimeframeAnalysis';
import { AssetSelector } from '@/components/intraday/AssetSelector';
import { PriceCard } from '@/components/intraday/PriceCard';
import { IntradayChart } from '@/components/intraday/IntradayChart';
import { DerivativesPanel } from '@/components/intraday/DerivativesPanel';
import { IntradaySignal } from '@/components/intraday/IntradaySignal';
import { TradingLevels } from '@/components/intraday/TradingLevels';
import { IntradayRecommendation } from '@/components/intraday/IntradayRecommendation';
import { TradeRecommender } from '@/components/intraday/TradeRecommender';

export function IntradayView() {
  const [selectedAsset, setSelectedAsset] = useState<IntradayAsset>('BTC');
  const [timeframe, setTimeframe] = useState<IntradayTimeframe>('15m');

  // Get validation timeframes for confluence analysis (from matrix)
  const validationTFs = useMemo(() => {
    const { lower, upper } = getValidationTimeframes(timeframe);
    // Combine and deduplicate, max 3 TFs to avoid rate limits
    const allTFs = [...new Set([...lower, ...upper])];
    return allTFs.slice(0, 3);
  }, [timeframe]);

  // Fetch data for current timeframe
  const { data: intradayData, isLoading: isLoadingIntraday, analysis } = useIntradayData(selectedAsset, timeframe);
  const { data: derivativesData, isLoading: isLoadingDerivatives } = useDerivatives();
  
  // Fetch data for validation timeframes (dynamic based on matrix)
  // We always call hooks in the same order with fixed positions
  const { data: tf1Data } = useIntradayData(
    selectedAsset, 
    (validationTFs[0] ?? '5m') as AllTimeframes
  );
  const { data: tf2Data } = useIntradayData(
    selectedAsset, 
    (validationTFs[1] ?? '1h') as AllTimeframes
  );
  const { data: tf3Data } = useIntradayData(
    selectedAsset, 
    (validationTFs[2] ?? '4h') as AllTimeframes
  );
  
  // Build adjacent data for confluence
  const adjacentData: AdjacentTFData = useMemo(() => {
    const signals: AdjacentTFData['signals'] = [];
    
    if (validationTFs[0] && tf1Data) {
      signals.push({ timeframe: validationTFs[0], data: tf1Data });
    }
    if (validationTFs[1] && tf2Data) {
      signals.push({ timeframe: validationTFs[1], data: tf2Data });
    }
    if (validationTFs[2] && tf3Data) {
      signals.push({ timeframe: validationTFs[2], data: tf3Data });
    }
    
    return { signals };
  }, [validationTFs, tf1Data, tf2Data, tf3Data]);
  
  // Calculate intelligent liquidation pools (ATR + volatility based)
  const liquidationData = useLiquidationPools(
    intradayData?.currentPrice ?? 0,
    selectedAsset,
    timeframe,
    intradayData?.candles ?? [],
    derivativesData ?? null,
    intradayData?.volatility ?? 1
  );
  
  // Calculate signal with multi-TF confluence
  const signal = useIntradaySignal(
    intradayData, 
    derivativesData, 
    timeframe,
    adjacentData
  );
  
  // All signals for Trade Recommender
  const { topSignals, isLoading: isLoadingAllSignals, getTradeSetup } = useAllSignals();

  const isLoading = isLoadingIntraday || isLoadingDerivatives;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">Trading Intradía</h1>
        <AssetSelector selectedAsset={selectedAsset} onAssetChange={setSelectedAsset} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Chart & Derivatives */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price Card (mobile only) */}
          <div className="lg:hidden">
            <PriceCard
              asset={selectedAsset}
              currentPrice={intradayData?.currentPrice ?? 0}
              change24h={intradayData?.change24h ?? 0}
              high24h={intradayData?.high24h ?? 0}
              low24h={intradayData?.low24h ?? 0}
              volatilityLevel={analysis?.volatilityLevel ?? 'Media'}
              isLoading={isLoading}
            />
          </div>

          {/* Chart */}
          <IntradayChart
            candles={intradayData?.candles ?? []}
            emas={intradayData?.emas ?? { ema9: null, ema21: null, ema50: null, ema9Values: [], ema21Values: [], ema50Values: [] }}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            isLoading={isLoadingIntraday}
          />

          {/* Derivatives Panel */}
          <DerivativesPanel
            derivativesData={derivativesData}
            liquidationData={liquidationData}
            isLoading={isLoadingDerivatives}
          />

          {/* Trading Levels (mobile) */}
          <div className="lg:hidden">
            <TradingLevels signal={signal} asset={selectedAsset} intradayData={intradayData} isLoading={isLoading} />
          </div>

          {/* Recommendation */}
          <IntradayRecommendation
            asset={selectedAsset}
            volatility={intradayData?.volatility ?? 1}
            volatilityLevel={analysis?.volatilityLevel ?? 'Media'}
            change24h={intradayData?.change24h ?? 0}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column - Signal & Levels */}
        <div className="space-y-4">
          {/* Price Card (desktop) */}
          <div className="hidden lg:block">
            <PriceCard
              asset={selectedAsset}
              currentPrice={intradayData?.currentPrice ?? 0}
              change24h={intradayData?.change24h ?? 0}
              high24h={intradayData?.high24h ?? 0}
              low24h={intradayData?.low24h ?? 0}
              volatilityLevel={analysis?.volatilityLevel ?? 'Media'}
              isLoading={isLoading}
            />
          </div>

          {/* Signal */}
          <IntradaySignal signal={signal} isLoading={isLoading} />

          {/* Trading Levels (desktop) */}
          <div className="hidden lg:block">
            <TradingLevels signal={signal} asset={selectedAsset} intradayData={intradayData} isLoading={isLoading} />
          </div>
          
          {/* Trade Recommender (desktop) */}
          <div className="hidden lg:block">
            <TradeRecommender 
              topSignals={topSignals} 
              getTradeSetup={getTradeSetup}
              isLoading={isLoadingAllSignals}
              currentPrice={intradayData?.currentPrice ?? 0}
              currentSignal={signal}
              liquidationData={liquidationData}
              volatility={intradayData?.volatility ?? 1}
              selectedAsset={selectedAsset}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
