import { TrendingUp, Target, Percent, Bot, Wifi, WifiOff } from "lucide-react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { InfoTooltip } from "./InfoTooltip";
import { AnimatedNumber } from "./AnimatedNumber";
import { OpportunityScore } from "./OpportunityScore";
import { USDTDominanceCard } from "./USDTDominanceCard";
import { CombinedSignalCard } from "./CombinedSignalCard";
import { PowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";
import { BitcoinPriceData } from "@/hooks/useBitcoinPrice";
import { useUSDTDominance } from "@/hooks/useUSDTDominance";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface RightSidebarProps {
  analysis: PowerLawAnalysis;
  priceData?: BitcoinPriceData;
  isPriceError?: boolean;
  dataUpdatedAt?: number;
}

export function RightSidebar({ analysis, priceData, isPriceError, dataUpdatedAt }: RightSidebarProps) {
  const { data: usdtData, isLoading: isUsdtLoading, isError: isUsdtError } = useUSDTDominance();
  
  return (
    <aside className="w-80 bg-background border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Card 1: Precio Actual */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-bitcoin" />
          <span className="text-sm font-medium text-muted-foreground">Precio Actual</span>
          <InfoTooltip content="Precio spot de Bitcoin en USD obtenido en tiempo real de CoinGecko" />
          {/* Live indicator */}
          {priceData?.isLive ? (
            <div className="flex items-center gap-1 ml-auto">
              <Wifi className="w-3 h-3 text-success" />
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-auto">
              <WifiOff className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-foreground">
          <AnimatedNumber value={analysis.btcPrice} prefix="$" />
        </div>
        
        {/* 24h change */}
        {priceData?.change24h !== null && priceData?.change24h !== undefined && (
          <div className={`text-sm font-medium mt-1 ${priceData.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
            {priceData.change24h >= 0 ? '▲' : '▼'} {Math.abs(priceData.change24h).toFixed(2)}% (24h)
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
          <span>Bitcoin (BTC)</span>
          {dataUpdatedAt && (
            <span className="text-[10px]">
              {formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: es })}
            </span>
          )}
        </div>
        
        {/* Error indicator */}
        {isPriceError && (
          <div className="mt-2 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
            ⚠️ Usando último valor conocido
          </div>
        )}
      </Card>

      {/* Card 2: Fair Value (Modelo) */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-info" />
          <span className="text-sm font-medium text-muted-foreground">Fair Value (Modelo)</span>
          <InfoTooltip content={`Precio justo calculado con el modelo Power Law basado en ${analysis.daysSinceGenesis.toLocaleString()} días desde el génesis de Bitcoin (3 enero 2009)`} />
        </div>
        <div className="text-3xl font-bold text-info">
          <AnimatedNumber value={Math.round(analysis.precioModelo)} prefix="$" />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Power Law • {analysis.daysSinceGenesis.toLocaleString()} días desde génesis
        </div>
      </Card>

      {/* Card 3: Ratio y Zona */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Ratio (R)</span>
            <InfoTooltip content="Ratio = Precio Actual / Precio Modelo. Ratio < 1.0 indica que BTC está infravalorado. Ratio > 1.0 indica sobrevaloración." />
          </div>
          <span className="text-2xl font-bold text-foreground">
            <AnimatedNumber value={analysis.ratio} decimals={2} />
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-2 bg-secondary rounded-full relative overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-success via-info to-danger rounded-full"
              style={{ width: '100%' }}
            />
            <div 
              className="absolute top-1/2 w-3 h-3 bg-today rounded-full border-2 border-background transition-all duration-500"
              style={{ 
                left: `${Math.min(Math.max(analysis.ratio / 3 * 100, 2), 98)}%`, 
                transform: 'translate(-50%, -50%)' 
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Piso (0.5x)</span>
            <span>Fair (1.0x)</span>
            <span>Techo (3.0x)</span>
          </div>
        </div>

        {/* Zona */}
        <div className="text-center">
          <Badge variant={analysis.badgeVariant}>{analysis.zona}</Badge>
          <p className="text-xs text-muted-foreground mt-2">
            {analysis.ratio < 1.0 
              ? `${((1 - analysis.ratio) * 100).toFixed(0)}% bajo fair value`
              : `${((analysis.ratio - 1) * 100).toFixed(0)}% sobre fair value`
            }
          </p>
        </div>
      </Card>

      {/* Card 4: Opportunity Score */}
      <OpportunityScore ratio={analysis.ratio} />

      {/* Card 5: USDT Dominance */}
      <USDTDominanceCard 
        data={usdtData}
        isLoading={isUsdtLoading}
        isError={isUsdtError}
      />

      {/* Card 6: Señal Combinada */}
      {usdtData && (
        <CombinedSignalCard 
          ratio={analysis.ratio}
          usdtTrend={usdtData.trend}
        />
      )}

      {/* Card 7: Recomendación IA (Destacada) */}
      <Card highlighted>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground">Recomendación IA</span>
        </div>
        
        <div className="text-center mb-4">
          <div className={`text-lg font-bold ${analysis.decisionColor}`}>
            {analysis.decision}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Score Total:</span>
            <span className="text-lg font-bold text-primary">
              <AnimatedNumber value={Math.round(analysis.scoreTotal)} suffix="/100" />
            </span>
          </div>
        </div>

        {/* Scores individuales */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Oportunidad:</span>
              <InfoTooltip content="Basado en qué tan infravalorado está BTC vs el modelo. Mayor score = mejor oportunidad de compra." />
            </div>
            <span className="font-medium text-success">
              <AnimatedNumber value={analysis.scoreOportunidad} suffix="/100" />
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Seguridad:</span>
              <InfoTooltip content="Basado en el LTV del préstamo. Menor LTV = mayor seguridad contra liquidación." />
            </div>
            <span className="font-medium text-info">
              <AnimatedNumber value={analysis.scoreSeguridad} suffix="/100" />
            </span>
          </div>
        </div>

        {/* Nivel de riesgo */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Nivel de Riesgo</div>
          <div className={`text-sm font-bold ${analysis.decisionColor}`}>
            {analysis.nivelRiesgoEmoji} {analysis.nivelRiesgo}
          </div>
        </div>
      </Card>
    </aside>
  );
}
