import { useQuery } from '@tanstack/react-query';

interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
    usd_24h_change?: number;
  };
}

export interface BitcoinPriceData {
  price: number;
  change24h: number | null;
  isLive: boolean;
}

const FALLBACK_PRICE = 95000;

async function fetchBitcoinPrice(): Promise<BitcoinPriceData> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch Bitcoin price');
  }
  
  const data: CoinGeckoResponse = await response.json();
  
  return {
    price: data.bitcoin.usd,
    change24h: data.bitcoin.usd_24h_change ?? null,
    isLive: true
  };
}

export function useBitcoinPrice() {
  return useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    staleTime: 60 * 1000,        // Fresh for 1 minute
    refetchInterval: 60 * 1000,  // Refetch every 1 minute
    retry: 3,
    placeholderData: {
      price: FALLBACK_PRICE,
      change24h: null,
      isLive: false
    },
  });
}
