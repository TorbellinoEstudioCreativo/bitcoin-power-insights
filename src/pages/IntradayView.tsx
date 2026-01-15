import React, { useState } from 'react';
import { useIntradayData, IntradayAsset, IntradayTimeframe } from '@/hooks/useIntradayData';
import { useLiquidationPools } from '@/hooks/useLiquidationPools';
import { useIntradaySignal } from '@/hooks/useIntradaySignal';
import { useDerivatives } from '@/hooks/useDerivatives';
import { AssetSelector } from '@/components/intraday/AssetSelector';
import { PriceCard } from '@/components/intraday/PriceCard';
import { IntradayChart } from '@/components/intraday/IntradayChart';
import { DerivativesPanel } from '@/components/intraday/DerivativesPanel';
import { IntradaySignal } from '@/components/intraday/IntradaySignal';
import { TradingLevels } from '@/components/intraday/TradingLevels';
import { IntradayRecommendation } from '@/components/intraday/IntradayRecommendation';

export function IntradayView() {
  const [selectedAsset, setSelectedAsset] = useState<IntradayAsset>('BTC');
  const [timeframe, setTimeframe] = useState<IntradayTimeframe>('15m');

  // Fetch data
  const { data: intradayData, isLoading: isLoadingIntraday, analysis } = useIntradayData(selectedAsset, timeframe);
  const { data: derivativesData, isLoading: isLoadingDerivatives } = useDerivatives();
  
  // Calculate liquidation pools
  const liquidationData = useLiquidationPools(
    intradayData?.currentPrice ?? 0,
    selectedAsset,
    intradayData?.volatility ?? 1
  );
  
  // Calculate signal
  const signal = useIntradaySignal(intradayData, derivativesData);

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
            <TradingLevels signal={signal} asset={selectedAsset} isLoading={isLoading} />
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
            <TradingLevels signal={signal} asset={selectedAsset} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
