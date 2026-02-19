// ============================================================================
// useScalpingSignal — Hook for a single asset/timeframe scalping evaluation
// ============================================================================

import { useMemo } from 'react';
import { useIntradayData, type IntradayAsset, type IntradayTimeframe } from './useIntradayData';
import { useDerivatives } from './useDerivatives';
import { evaluateScalpingGates, type ScalpingSignal } from '@/lib/scalpingEngine';

// Higher TF mapping: 1m → 5m, 5m → 15m
const HIGHER_TF_MAP: Record<string, IntradayTimeframe> = {
  '1m': '5m',
  '5m': '15m',
};

export function useScalpingSignal(
  asset: IntradayAsset,
  timeframe: '1m' | '5m',
  enabled: boolean = true
): { signal: ScalpingSignal | null; isLoading: boolean } {
  // Primary TF data (shared cache via TanStack Query)
  const { data: primaryData, isLoading: isLoadingPrimary } = useIntradayData(asset, timeframe, enabled);

  // Higher TF data for gate 8
  const higherTF = HIGHER_TF_MAP[timeframe];
  const { data: higherTFData, isLoading: isLoadingHigher } = useIntradayData(asset, higherTF, enabled);

  // Derivatives data (shared cache)
  const { data: derivativesData, isLoading: isLoadingDerivatives } = useDerivatives();

  const isLoading = isLoadingPrimary || isLoadingHigher || isLoadingDerivatives;

  const signal = useMemo(() => {
    if (!primaryData) return null;

    return evaluateScalpingGates(
      primaryData,
      derivativesData,
      higherTFData,
      asset,
      timeframe
    );
  }, [primaryData, derivativesData, higherTFData, asset, timeframe]);

  return { signal, isLoading };
}
