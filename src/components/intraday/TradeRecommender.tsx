import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  AlertTriangle,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignalScore, TradeSetup } from '@/lib/tradeRecommender';
import type { IntradaySignal } from '@/hooks/useIntradaySignal';
import type { LiquidationData } from '@/hooks/useLiquidationPools';
import type { IntradayAsset } from '@/hooks/useIntradayData';
import { PositionManager } from './PositionManager';

interface TradeRecommenderProps {
  topSignals: SignalScore[];
  getTradeSetup: (signal: SignalScore) => TradeSetup | null;
  isLoading?: boolean;
  // Props for Position Manager
  currentPrice: number;
  currentSignal: IntradaySignal | null;
  liquidationData: LiquidationData | null;
  volatility: number;
  selectedAsset: IntradayAsset;
}

export function TradeRecommender({ 
  topSignals, 
  getTradeSetup,
  isLoading = false,
  currentPrice,
  currentSignal,
  liquidationData,
  volatility,
  selectedAsset
}: TradeRecommenderProps) {
  const [activeTab, setActiveTab] = useState<'signals' | 'position'>('signals');
  const [selectedSignal, setSelectedSignal] = useState<SignalScore | null>(null);
  const [capital, setCapital] = useState(1000);
  
  const selectedSetup = useMemo(() => {
    if (!selectedSignal) return null;
    return getTradeSetup(selectedSignal);
  }, [selectedSignal, getTradeSetup]);
  
  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    return '🥉';
  };
  
  // Handle capital input with validation
  const handleCapitalChange = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      setCapital(0);
    } else if (num > 10000000) {
      setCapital(10000000); // Cap at 10M
    } else {
      setCapital(num);
    }
  };
  
  // Loading state with skeleton
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold text-foreground">Mejores Señales</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Analizando señales de todos los timeframes...
        </p>
      </Card>
    );
  }
  
  // Empty state
  if (topSignals.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="w-5 h-5 text-primary/50" />
          <span className="text-sm">Sin señales disponibles</span>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button 
          onClick={() => setActiveTab('signals')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1",
            activeTab === 'signals' 
              ? "bg-background shadow text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Señales
        </button>
        <button 
          onClick={() => setActiveTab('position')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1",
            activeTab === 'position' 
              ? "bg-background shadow text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="w-4 h-4" />
          Mi Posición
        </button>
      </div>
      
      {/* Position Manager Tab */}
      {activeTab === 'position' && (
        <PositionManager 
          currentPrice={currentPrice}
          currentSignal={currentSignal}
          liquidationData={liquidationData}
          volatility={volatility}
          selectedAsset={selectedAsset}
        />
      )}
      
      {/* Signals Tab */}
      {activeTab === 'signals' && (
        <>
          {/* Top 3 Signals Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Mejores Señales</h3>
            </div>
        
        <div className="space-y-2">
          {topSignals.map((signal) => (
            <button
              key={`${signal.asset}-${signal.timeframe}`}
              onClick={() => setSelectedSignal(signal)}
              className={cn(
                "w-full p-3 rounded-lg border transition-all text-left",
                selectedSignal?.asset === signal.asset && 
                selectedSignal?.timeframe === signal.timeframe
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getMedal(signal.rank)}</span>
                  <span className="font-bold text-foreground">{signal.asset}</span>
                  <Badge 
                    variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {signal.direction === 'LONG' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {signal.direction}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {signal.timeframe}
                  </Badge>
                </div>
                <span className="text-lg font-bold text-primary">
                  {signal.totalScore}%
                </span>
              </div>
              
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span>Conf: {signal.confidence}%</span>
                <span>Multi-TF: {signal.confluenceScore}%</span>
              </div>
            </button>
          ))}
        </div>
      </Card>
      
      {/* Error state when signal selected but setup failed */}
      {selectedSignal && !selectedSetup && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">No se pudo generar el setup</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Intenta seleccionar otra señal con mejor confluencia.
          </p>
        </Card>
      )}
      
      {/* Trade Simulator Card */}
      {selectedSetup && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Simulador</h3>
          </div>
          
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1 block">
              Capital (USDT)
            </label>
            <Input
              type="number"
              value={capital}
              onChange={(e) => handleCapitalChange(e.target.value)}
              min={0}
              max={10000000}
              className="text-lg font-semibold"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Señal</p>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={selectedSetup.signal.direction === 'LONG' ? 'default' : 'destructive'}
                >
                  {selectedSetup.signal.asset} {selectedSetup.signal.direction}
                </Badge>
                <Badge variant="outline">{selectedSetup.signal.timeframe}</Badge>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Apalancamiento</span>
                <span className="text-xl font-bold text-primary">
                  {selectedSetup.leverage.suggested}x
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedSetup.leverage.reason}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rango: {selectedSetup.leverage.min}x - {selectedSetup.leverage.max}x
              </p>
              
              {selectedSetup.leverage.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedSetup.leverage.warnings.map((warning, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Entry:
                </span>
                <span className="font-mono font-semibold text-foreground">
                  ${selectedSetup.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  SL:
                </span>
                <div className="text-right">
                  <span className="font-mono font-semibold text-destructive">
                    ${selectedSetup.stopLoss.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-destructive/80 ml-2">
                    -{selectedSetup.stopLoss.distancePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              {selectedSetup.takeProfits.map((tp) => (
                <div key={tp.level} className="flex items-center justify-between text-sm">
                  <span className="text-primary flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    TP{tp.level}:
                    <Badge variant="outline" className="text-xs px-1">
                      {tp.exitPercent}%
                    </Badge>
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-primary">
                      ${tp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-primary/80 ml-2">
                      +{tp.distancePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Posición:</span>
                <span className="font-bold text-foreground">
                  ${capital > 0 ? (capital * selectedSetup.leverage.suggested).toLocaleString() : '0'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Riesgo:</span>
                <span className="text-destructive">
                  -${capital > 0 ? (capital * selectedSetup.stopLoss.distancePercent / 100 * selectedSetup.leverage.suggested).toFixed(2) : '0.00'}
                  <span className="text-xs ml-1">
                    (-{(selectedSetup.stopLoss.distancePercent * selectedSetup.leverage.suggested).toFixed(1)}%)
                  </span>
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ganancia TP3:</span>
                <span className="text-primary font-semibold">
                  +${capital > 0 ? (capital * selectedSetup.takeProfits[selectedSetup.takeProfits.length - 1].distancePercent / 100 * selectedSetup.leverage.suggested).toFixed(2) : '0.00'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">R:R</span>
                <Badge variant={selectedSetup.riskReward >= 1.5 ? 'default' : 'outline'}>
                  1:{selectedSetup.riskReward.toFixed(1)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <Clock className="w-3 h-3" />
                Duración: {selectedSetup.estimatedDuration}
              </div>
            </div>
          </div>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
