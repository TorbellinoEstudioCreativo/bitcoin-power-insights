export interface USDTDominanceData {
  dominance: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  usdtMarketCap: number;
  totalMarketCap: number;
  timestamp: number;
}

// Keys para localStorage
const STORAGE_KEY = 'usdt-dominance-history';
const MAX_HISTORY = 5;

export async function fetchUSDTDominance(): Promise<USDTDominanceData> {
  // Fetch en paralelo para optimizar
  const [globalRes, usdtRes] = await Promise.all([
    fetch('https://api.coingecko.com/api/v3/global'),
    fetch('https://api.coingecko.com/api/v3/coins/tether?localization=false&tickers=false&community_data=false&developer_data=false')
  ]);
  
  if (!globalRes.ok || !usdtRes.ok) {
    throw new Error('Failed to fetch USDT dominance data');
  }
  
  const [globalData, usdtData] = await Promise.all([
    globalRes.json(),
    usdtRes.json()
  ]);
  
  const totalMarketCap = globalData.data.total_market_cap.usd;
  const usdtMarketCap = usdtData.market_data.market_cap.usd;
  const dominance = (usdtMarketCap / totalMarketCap) * 100;
  
  // Calcular tendencia basada en historial
  const { trend, change } = calculateTrend(dominance);
  
  // Guardar en historial
  saveToHistory(dominance);
  
  return {
    dominance,
    trend,
    change,
    usdtMarketCap,
    totalMarketCap,
    timestamp: Date.now()
  };
}

function calculateTrend(currentDominance: number): { trend: 'up' | 'down' | 'neutral'; change: number } {
  const history = getHistory();
  
  if (history.length < 2) {
    return { trend: 'neutral', change: 0 };
  }
  
  // Promedio de últimas lecturas (excluyendo la más reciente que aún no se ha guardado)
  const avgPrev = history.reduce((a, b) => a + b, 0) / history.length;
  const change = currentDominance - avgPrev;
  
  // Umbral de 0.05% para detectar cambio significativo
  if (change > 0.05) return { trend: 'up', change };
  if (change < -0.05) return { trend: 'down', change };
  return { trend: 'neutral', change };
}

function getHistory(): number[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToHistory(dominance: number): void {
  try {
    const history = getHistory();
    history.push(dominance);
    
    // Mantener solo últimos MAX_HISTORY valores
    while (history.length > MAX_HISTORY) {
      history.shift();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Silently fail if localStorage is not available
  }
}
