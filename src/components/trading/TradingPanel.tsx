import { useState, useEffect } from "react";
import { Card } from "./Card";
import { BuyOrdersPanel } from "./BuyOrdersPanel";
import { SellOrdersPanel } from "./SellOrdersPanel";
import { useTechnicalAnalysis } from "@/hooks/useTechnicalAnalysis";
import { useTradingOrders, TradingInputs } from "@/hooks/useTradingOrders";
import { PowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStablePrice } from "@/hooks/useStablePrice";

interface TradingPanelProps {
  analysis: PowerLawAnalysis;
  btcPrice: number;
}

const STORAGE_KEY = 'btc-trading-inputs';

function loadTradingInputs(): TradingInputs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading trading inputs:', e);
  }
  return {
    apalancamiento: 3,
    usdtDisponibles: 1000,
    tamañoPosicion: 5000,
    precioEntrada: 0,
  };
}

function saveTradingInputs(inputs: TradingInputs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch (e) {
    console.error('Error saving trading inputs:', e);
  }
}

export function TradingPanel({ analysis, btcPrice }: TradingPanelProps) {
  const { language } = useLanguage();
  const [inputs, setInputs] = useState<TradingInputs>(() => {
    const loaded = loadTradingInputs();
    // Set precio entrada to current price if not set
    if (loaded.precioEntrada === 0) {
      loaded.precioEntrada = btcPrice;
    }
    return loaded;
  });
  
  // Get stable price info for recalculation threshold
  const { shouldRecalculate, isStable, priceChangePercent } = useStablePrice();
  
  // Persist inputs to localStorage
  useEffect(() => {
    saveTradingInputs(inputs);
  }, [inputs]);
  
  // Get technical analysis
  const { soportes, resistencias, emas } = useTechnicalAnalysis(btcPrice, analysis);
  
  // Get trading orders with stability check
  const { ordenesCompra, ordenesVenta } = useTradingOrders(
    btcPrice,
    analysis.ratio,
    soportes,
    resistencias,
    inputs,
    shouldRecalculate,
    emas  // Pass EMAs for resistance detection
  );
  
  const handleInputChange = (field: keyof TradingInputs, value: string) => {
    const rawValue = value.replace(/,/g, '');
    const numValue = parseFloat(rawValue) || 0;
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };
  
  const formatValue = (value: number, showDecimals: boolean = false): string => {
    if (value === 0) return '';
    return showDecimals ? value.toString() : value.toLocaleString('en-US');
  };
  
  return (
    <div className="space-y-4">
      {/* Inputs Card */}
      <Card className="p-4 border-2 border-primary/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            📊 {language === 'es' ? 'Tu Posición Actual' : 'Your Current Position'}
          </h3>
          
          {/* Stability Indicator */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
            isStable 
              ? 'bg-success/20 text-success' 
              : 'bg-warning/20 text-warning'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isStable 
                ? 'bg-success' 
                : 'bg-warning animate-pulse'
            }`} />
            <span>
              {isStable 
                ? (language === 'es' ? 'Estable' : 'Stable')
                : (language === 'es' ? 'Actualizando...' : 'Updating...')
              }
            </span>
            {Math.abs(priceChangePercent) > 0.01 && (
              <span className="text-muted-foreground">
                ({priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {language === 'es' ? 'Apalancamiento' : 'Leverage'}
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formatValue(inputs.apalancamiento, true)}
                onChange={(e) => handleInputChange('apalancamiento', e.target.value)}
                placeholder="3"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground 
                           focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">x</span>
            </div>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {language === 'es' ? 'USDT Disponibles' : 'Available USDT'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatValue(inputs.usdtDisponibles)}
                onChange={(e) => handleInputChange('usdtDisponibles', e.target.value)}
                placeholder="1,000"
                className="w-full bg-secondary border border-border rounded-lg pl-7 pr-3 py-2 text-foreground 
                           focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {language === 'es' ? 'Tamaño Posición' : 'Position Size'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatValue(inputs.tamañoPosicion)}
                onChange={(e) => handleInputChange('tamañoPosicion', e.target.value)}
                placeholder="5,000"
                className="w-full bg-secondary border border-border rounded-lg pl-7 pr-3 py-2 text-foreground 
                           focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {language === 'es' ? 'Precio Entrada' : 'Entry Price'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatValue(inputs.precioEntrada)}
                onChange={(e) => handleInputChange('precioEntrada', e.target.value)}
                placeholder={btcPrice.toLocaleString()}
                className="w-full bg-secondary border border-border rounded-lg pl-7 pr-3 py-2 text-foreground 
                           focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Orders Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BuyOrdersPanel 
          ordenesCompra={ordenesCompra} 
          precioActual={btcPrice} 
        />
        <SellOrdersPanel 
          ordenesVenta={ordenesVenta} 
          precioActual={btcPrice}
          precioEntrada={inputs.precioEntrada}
        />
      </div>
    </div>
  );
}
