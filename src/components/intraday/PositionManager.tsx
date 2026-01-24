import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Target,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Bitcoin,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenPosition, PositionAnalysis, TacticalAction } from '@/lib/tradeRecommender';
import type { IntradaySignal } from '@/hooks/useIntradaySignal';
import type { LiquidationData } from '@/hooks/useLiquidationPools';
import type { IntradayAsset } from '@/hooks/useIntradayData';
import { analyzeOpenPosition, buildOpenPosition, calculatePnL, calculatePersonalLiquidation, getMaintenanceMarginRate } from '@/lib/positionManager';

interface PositionManagerProps {
  currentPrice: number;
  currentSignal: IntradaySignal | null;
  liquidationData: LiquidationData | null;
  volatility: number;
  selectedAsset: IntradayAsset;
}

const STORAGE_KEY = 'openPosition';

const ASSET_ICONS: Record<IntradayAsset, React.ReactNode> = {
  BTC: <Bitcoin className="w-4 h-4" />,
  ETH: <Coins className="w-4 h-4" />,
  BNB: <Coins className="w-4 h-4" />
};

const ASSET_COLORS: Record<IntradayAsset, string> = {
  BTC: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
  ETH: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  BNB: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
};

export function PositionManager({ 
  currentPrice, 
  currentSignal, 
  liquidationData, 
  volatility,
  selectedAsset 
}: PositionManagerProps) {
  const [positionInput, setPositionInput] = useState({
    asset: selectedAsset as IntradayAsset,
    direction: 'LONG' as 'LONG' | 'SHORT',
    entryPrice: '',
    size: '',
    leverage: ''
  });
  
  const [savedPosition, setSavedPosition] = useState<{
    asset: IntradayAsset;
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    size: number;
    leverage: number;
  } | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  
  // Load saved position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedPosition(parsed);
        setPositionInput({
          asset: parsed.asset || 'BTC',
          direction: parsed.direction,
          entryPrice: parsed.entryPrice.toString(),
          size: parsed.size.toString(),
          leverage: parsed.leverage.toString()
        });
      }
    } catch (e) {
      console.warn('[PositionManager] Error loading saved position:', e);
    }
  }, []);
  
  // Detect asset mismatch (position is for a different asset than current chart)
  const assetMismatch = savedPosition && savedPosition.asset !== selectedAsset;
  
  // Build current position with live price
  const position = useMemo(() => {
    if (!savedPosition || currentPrice <= 0) return null;
    
    return buildOpenPosition(
      savedPosition.asset,
      savedPosition.direction,
      savedPosition.entryPrice,
      savedPosition.size,
      savedPosition.leverage,
      currentPrice
    );
  }, [savedPosition, currentPrice]);
  
  // Analyze position
  const analysis = useMemo(() => {
    if (!position) return null;
    return analyzeOpenPosition(position, currentSignal, liquidationData, volatility);
  }, [position, currentSignal, liquidationData, volatility]);
  
  // Handle input validation
  const handleInputChange = (field: string, value: string) => {
    if (field === 'direction') {
      setPositionInput(prev => ({ ...prev, direction: value as 'LONG' | 'SHORT' }));
      return;
    }
    
    if (field === 'asset') {
      setPositionInput(prev => ({ ...prev, asset: value as IntradayAsset }));
      return;
    }
    
    // Only allow valid numbers
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setPositionInput(prev => ({ ...prev, [field]: value }));
    }
  };
  
  // Save position
  const handleSavePosition = () => {
    const entryPrice = parseFloat(positionInput.entryPrice);
    const size = parseFloat(positionInput.size);
    const leverage = parseFloat(positionInput.leverage);
    
    if (!entryPrice || entryPrice <= 0) return;
    if (!size || size <= 0) return;
    if (!leverage || leverage <= 0 || leverage > 200) return;
    
    // Use the selected asset from the form, NOT from the chart context
    const newPosition = {
      asset: positionInput.asset,
      direction: positionInput.direction,
      entryPrice,
      size,
      leverage
    };
    
    setSavedPosition(newPosition);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosition));
    setIsEditing(false);
  };
  
  // Clear position
  const handleClearPosition = () => {
    setSavedPosition(null);
    localStorage.removeItem(STORAGE_KEY);
    setPositionInput({
      asset: selectedAsset,
      direction: 'LONG',
      entryPrice: '',
      size: '',
      leverage: ''
    });
    setIsEditing(false);
  };
  
  // Get urgency color
  const getUrgencyColor = (urgency: TacticalAction['urgency']) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
    }
  };
  
  // Get action icon
  const getActionIcon = (type: TacticalAction['type']) => {
    switch (type) {
      case 'PARTIAL_CLOSE': return <XCircle className="w-4 h-4" />;
      case 'DCA_BUY': return <TrendingUp className="w-4 h-4" />;
      case 'SCALP_SELL': return <TrendingDown className="w-4 h-4" />;
      case 'FULL_EXIT': return <AlertTriangle className="w-4 h-4" />;
    }
  };
  
  // If no saved position or editing, show input form
  if (!savedPosition || isEditing) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Position Manager</h3>
          </div>
          {savedPosition && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mb-4">
          Analiza tu posición abierta y recibe recomendaciones tácticas
        </p>
        
        <div className="space-y-3">
          {/* Asset Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Asset
            </label>
            <div className="flex gap-2">
              {(['BTC', 'ETH', 'BNB'] as IntradayAsset[]).map(asset => (
                <Button
                  key={asset}
                  variant={positionInput.asset === asset ? 'default' : 'outline'}
                  onClick={() => handleInputChange('asset', asset)}
                  className={cn(
                    "flex-1",
                    positionInput.asset === asset && ASSET_COLORS[asset]
                  )}
                  size="sm"
                >
                  {ASSET_ICONS[asset]}
                  <span className="ml-1">{asset}</span>
                </Button>
              ))}
            </div>
          </div>
          
          {/* Direction */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Dirección
            </label>
            <div className="flex gap-2">
              <Button
                variant={positionInput.direction === 'LONG' ? 'default' : 'outline'}
                onClick={() => handleInputChange('direction', 'LONG')}
                className="flex-1"
                size="sm"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                LONG
              </Button>
              <Button
                variant={positionInput.direction === 'SHORT' ? 'destructive' : 'outline'}
                onClick={() => handleInputChange('direction', 'SHORT')}
                className="flex-1"
                size="sm"
              >
                <TrendingDown className="w-4 h-4 mr-1" />
                SHORT
              </Button>
            </div>
          </div>
          
          {/* Entry Price */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Entry Price (USD)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={positionInput.entryPrice}
              onChange={(e) => handleInputChange('entryPrice', e.target.value)}
              placeholder={`ej: ${currentPrice.toFixed(0)}`}
              className="font-mono"
            />
          </div>
          
          {/* Size */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Tamaño ({positionInput.asset})
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={positionInput.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              placeholder="ej: 0.036"
              className="font-mono"
            />
          </div>
          
          {/* Leverage */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Apalancamiento
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={positionInput.leverage}
              onChange={(e) => handleInputChange('leverage', e.target.value)}
              placeholder="ej: 4"
              className="font-mono"
            />
          </div>
          
          <Button 
            onClick={handleSavePosition}
            className="w-full"
            disabled={
              !positionInput.entryPrice || 
              !positionInput.size || 
              !positionInput.leverage
            }
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Analizar Posición
          </Button>
        </div>
      </Card>
    );
  }
  
  // If position exists but no analysis yet (loading or error)
  if (!analysis) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="font-semibold text-foreground">Analizando posición...</h3>
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }
  
  // Show analysis
  return (
    <div className="space-y-4">
      {/* Position Status Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Tu Posición</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleClearPosition}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Asset Mismatch Warning */}
        {assetMismatch && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-500">
              Tu posición es en <strong>{savedPosition?.asset}</strong>, pero estás viendo el gráfico de <strong>{selectedAsset}</strong>. 
              Cambia al gráfico de {savedPosition?.asset} para ver datos en tiempo real.
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-3">
          <Badge 
            variant="outline" 
            className={cn("font-bold border", savedPosition && ASSET_COLORS[savedPosition.asset])}
          >
            {ASSET_ICONS[analysis.position.asset as IntradayAsset]}
            <span className="ml-1">{analysis.position.asset}</span>
          </Badge>
          <Badge 
            variant={analysis.position.direction === 'LONG' ? 'default' : 'destructive'}
          >
            {analysis.position.direction}
          </Badge>
          <Badge variant="outline">
            {analysis.position.leverage}x
          </Badge>
          <Badge variant="outline" className="text-xs">
            MMR: {(getMaintenanceMarginRate(analysis.position.asset as IntradayAsset) * 100).toFixed(1)}%
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Entry:</span>
            <p className="font-mono font-semibold">
              ${analysis.position.entryPrice.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Actual:</span>
            <p className="font-mono font-semibold">
              ${analysis.position.currentPrice.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Tamaño:</span>
            <p className="font-mono font-semibold">
              {analysis.position.currentSize.toFixed(4)} {analysis.position.asset}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Valor:</span>
            <p className="font-mono font-semibold">
              ${analysis.position.positionValueUSDT.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Liquidación:</span>
            <p className="font-mono font-semibold text-red-400">
              ${analysis.riskAssessment.nearbyLiquidationZone.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Margen:</span>
            <p className="font-mono font-semibold text-amber-400">
              {analysis.riskAssessment.distanceToLiquidation.toFixed(1)}%
            </p>
          </div>
        </div>
        
        {/* PnL Display */}
        <div className={cn(
          "p-3 rounded-lg",
          analysis.position.pnlPercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">PnL:</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-mono font-bold text-lg",
                analysis.position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {analysis.position.pnlPercent >= 0 ? '+' : ''}{analysis.position.pnlUSDT.toFixed(2)} USDT
              </span>
              <Badge 
                variant={analysis.position.pnlPercent >= 0 ? 'default' : 'destructive'}
                className="font-mono"
              >
                {analysis.position.pnlPercent >= 0 ? '+' : ''}{analysis.position.pnlPercent.toFixed(2)}%
              </Badge>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Evaluation Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Evaluación</h3>
        </div>
        
        <div className="space-y-2 mb-4">
          {analysis.reasoning.map((r, i) => (
            <p key={i} className="text-sm text-muted-foreground">{r}</p>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Recomendación:</span>
          <Badge 
            variant={
              analysis.recommendation === 'EXIT' ? 'destructive' :
              analysis.recommendation === 'REDUCE' ? 'secondary' :
              analysis.recommendation === 'DCA' ? 'default' :
              analysis.recommendation === 'FLIP' ? 'destructive' :
              'outline'
            }
            className="font-bold"
          >
            {analysis.recommendation}
          </Badge>
        </div>
      </Card>
      
      {/* Tactical Actions Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Acciones Sugeridas</h3>
        </div>
        
        {analysis.tacticalActions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay acciones tácticas recomendadas en este momento.
          </p>
        ) : (
          <div className="space-y-3">
            {analysis.tacticalActions.map((action, i) => (
              <div 
                key={i}
                className="p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(action.type)}
                    <span className="font-medium text-sm text-foreground">
                      {action.type.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge className={getUrgencyColor(action.urgency)}>
                    {action.urgency.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-mono ml-1 text-foreground">
                      ${action.triggerPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cantidad:</span>
                    <span className="font-mono ml-1 text-foreground">
                      {action.amount.toFixed(4)} ({action.amountPercent}%)
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {action.reason}
                </p>
                
                {action.expectedEffect.newAvgEntry && (
                  <p className="text-xs text-primary">
                    Nuevo entry promedio: ${action.expectedEffect.newAvgEntry.toFixed(0)}
                  </p>
                )}
                
                {action.expectedEffect.riskReduction && (
                  <p className="text-xs text-green-500">
                    ✓ {action.expectedEffect.riskReduction}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
