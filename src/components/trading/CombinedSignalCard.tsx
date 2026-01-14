import { Zap, Activity, Clock } from "lucide-react";
import { Card } from "./Card";
import { InfoTooltip } from "./InfoTooltip";
import { DerivativesData } from "@/lib/derivatives";

interface CombinedSignalCardProps {
  ratio: number;
  usdtTrend: 'up' | 'down' | 'neutral';
  derivativesData?: DerivativesData;
}

interface Signal {
  level: 'maximum' | 'good' | 'caution' | 'neutral' | 'risk' | 'maximum-risk';
  emoji: string;
  title: string;
  description: string;
  colorClass: string;
  bgClass: string;
}

export function CombinedSignalCard({ ratio, usdtTrend, derivativesData }: CombinedSignalCardProps) {
  // Calcular score adicional de derivados
  const derivativesScore = derivativesData?.combinedScore ?? 0;
  
  const getSignal = (): Signal => {
    // Calcular score base por ratio y USDT
    let baseScore = 0;
    
    // Score por ratio (valoración)
    if (ratio < 0.8) baseScore += 40;
    else if (ratio < 1.0) baseScore += 20;
    else if (ratio > 2.0) baseScore -= 40;
    else if (ratio > 1.5) baseScore -= 20;
    
    // Score por USDT trend
    if (usdtTrend === 'down') baseScore += 20; // Capital entrando
    else if (usdtTrend === 'up') baseScore -= 20; // Capital saliendo
    
    // Sumar score de derivados
    const totalScore = baseScore + derivativesScore;
    
    // Determinar señal basada en score total
    if (totalScore >= 50) {
      return {
        level: 'maximum',
        emoji: '🟢🟢',
        title: 'MÁXIMA OPORTUNIDAD',
        description: 'Todos los indicadores alineados',
        colorClass: 'text-success',
        bgClass: 'bg-success/10 border-success/30'
      };
    }
    
    if (totalScore >= 25) {
      return {
        level: 'good',
        emoji: '🟢',
        title: 'BUENA OPORTUNIDAD',
        description: 'Mayoría de indicadores positivos',
        colorClass: 'text-success',
        bgClass: 'bg-success/10 border-success/20'
      };
    }
    
    if (totalScore <= -50) {
      return {
        level: 'maximum-risk',
        emoji: '🔴🔴',
        title: 'MÁXIMO RIESGO',
        description: 'Todos los indicadores negativos',
        colorClass: 'text-danger',
        bgClass: 'bg-danger/10 border-danger/30'
      };
    }
    
    if (totalScore <= -25) {
      return {
        level: 'risk',
        emoji: '🔴',
        title: 'ALTO RIESGO',
        description: 'Mayoría de indicadores negativos',
        colorClass: 'text-danger',
        bgClass: 'bg-danger/10 border-danger/20'
      };
    }
    
    if (totalScore < 0) {
      return {
        level: 'caution',
        emoji: '🟡',
        title: 'PRECAUCIÓN',
        description: 'Señales mixtas con sesgo negativo',
        colorClass: 'text-warning',
        bgClass: 'bg-warning/10 border-warning/30'
      };
    }
    
    // Neutral: Score cercano a 0
    return {
      level: 'neutral',
      emoji: '🔵',
      title: 'NEUTRAL',
      description: 'Condiciones mixtas, evaluar otros factores',
      colorClass: 'text-info',
      bgClass: 'bg-info/10 border-info/20'
    };
  };

  const signal = getSignal();

  return (
    <Card className={`border ${signal.bgClass}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Zap className={`w-4 h-4 ${signal.colorClass}`} />
        <span className="text-sm font-medium text-muted-foreground">Señal Combinada</span>
        <InfoTooltip 
          content="Combina el Ratio Power Law (valoración de BTC) con la tendencia de USDT Dominance (flujo de capital) para una señal más precisa." 
        />
      </div>
      
      {/* Signal */}
      <div className="text-center mb-3">
        <div className="text-2xl mb-1">{signal.emoji}</div>
        <div className={`text-lg font-bold ${signal.colorClass}`}>
          {signal.title}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {signal.description}
        </p>
      </div>
      
      {/* Inputs */}
      <div className="space-y-1.5 text-xs bg-secondary/30 rounded-lg p-2">
        {/* Fila 1: Ratio y USDT */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ratio:</span>
            <span className="font-medium text-foreground">{ratio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">USDT:</span>
            <span className={`font-medium ${
              usdtTrend === 'up' ? 'text-danger' : 
              usdtTrend === 'down' ? 'text-success' : 
              'text-muted-foreground'
            }`}>
              {usdtTrend === 'up' ? '↗️' : usdtTrend === 'down' ? '↘️' : '→'}
            </span>
          </div>
        </div>
        
        {/* Fila 2: Derivados (si disponible) */}
        {derivativesData && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-info" />
              <span className="text-muted-foreground">OI:</span>
              <span className={`font-medium ${
                derivativesData.openInterest.change24h >= 5 ? 'text-success' :
                derivativesData.openInterest.change24h <= -5 ? 'text-danger' :
                'text-muted-foreground'
              }`}>
                {derivativesData.openInterest.change24h >= 0 ? '+' : ''}
                {derivativesData.openInterest.change24h.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-info" />
              <span className="text-muted-foreground">FR:</span>
              <span className={`font-medium ${
                derivativesData.fundingRate.fundingRatePercent >= 0.05 ? 'text-danger' :
                derivativesData.fundingRate.fundingRatePercent <= -0.01 ? 'text-success' :
                'text-muted-foreground'
              }`}>
                {derivativesData.fundingRate.fundingRatePercent >= 0 ? '+' : ''}
                {derivativesData.fundingRate.fundingRatePercent.toFixed(3)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
