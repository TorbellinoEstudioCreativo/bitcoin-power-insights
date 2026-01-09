import { useState, useEffect, useMemo } from 'react';
import { useBitcoinPrice } from './useBitcoinPrice';
import { globalCache } from '@/lib/stableCache';

export interface StablePriceData {
  price: number;
  change24h: number | null;
  isLive: boolean;
  shouldRecalculate: boolean;
  priceChangePercent: number;
  isStable: boolean;
  lastRecalculatedPrice: number;
}

/**
 * Hook que envuelve useBitcoinPrice y añade lógica de umbral
 * para determinar cuándo se deben recalcular los niveles
 */
export function useStablePrice(threshold: number = 0.005): StablePriceData {
  const { data: priceData, isError } = useBitcoinPrice();
  const [lastRecalculatedPrice, setLastRecalculatedPrice] = useState(0);
  
  const price = priceData?.price ?? 0;
  const change24h = priceData?.change24h ?? null;
  const isLive = priceData?.isLive ?? false;
  
  // Determinar si debe recalcular
  const shouldRecalculate = useMemo(() => {
    if (price === 0) return false;
    return globalCache.shouldRecalculate(price, threshold);
  }, [price, threshold]);
  
  // Calcular cambio porcentual
  const priceChangePercent = useMemo(() => {
    return globalCache.getPriceChangePercent(price);
  }, [price]);
  
  // Marcar recálculo cuando corresponda
  useEffect(() => {
    if (shouldRecalculate && price > 0) {
      globalCache.markRecalculated(price);
      setLastRecalculatedPrice(price);
    }
  }, [shouldRecalculate, price]);
  
  // isStable = no necesita recalcular y ya pasó la primera vez
  const isStable = !shouldRecalculate && lastRecalculatedPrice > 0;
  
  return {
    price,
    change24h,
    isLive,
    shouldRecalculate,
    priceChangePercent,
    isStable,
    lastRecalculatedPrice: lastRecalculatedPrice || price
  };
}
