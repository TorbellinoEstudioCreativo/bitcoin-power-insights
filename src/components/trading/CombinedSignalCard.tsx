import { Zap } from "lucide-react";
import { Card } from "./Card";
import { InfoTooltip } from "./InfoTooltip";

interface CombinedSignalCardProps {
  ratio: number;
  usdtTrend: 'up' | 'down' | 'neutral';
}

interface Signal {
  level: 'maximum' | 'good' | 'caution' | 'neutral' | 'risk' | 'maximum-risk';
  emoji: string;
  title: string;
  description: string;
  colorClass: string;
  bgClass: string;
}

export function CombinedSignalCard({ ratio, usdtTrend }: CombinedSignalCardProps) {
  const getSignal = (): Signal => {
    // Máxima oportunidad: BTC infravalorado + capital entrando
    if (ratio < 0.8 && usdtTrend === 'down') {
      return {
        level: 'maximum',
        emoji: '🟢🟢',
        title: 'MÁXIMA OPORTUNIDAD',
        description: 'BTC infravalorado + Capital entrando',
        colorClass: 'text-success',
        bgClass: 'bg-success/10 border-success/30'
      };
    }
    
    // Buena oportunidad: BTC infravalorado + mercado neutral
    if (ratio < 0.8 && usdtTrend === 'neutral') {
      return {
        level: 'good',
        emoji: '🟢',
        title: 'BUENA OPORTUNIDAD',
        description: 'BTC infravalorado, mercado estable',
        colorClass: 'text-success',
        bgClass: 'bg-success/10 border-success/20'
      };
    }
    
    // Precaución: BTC infravalorado pero hay miedo
    if (ratio < 0.8 && usdtTrend === 'up') {
      return {
        level: 'caution',
        emoji: '🟡',
        title: 'PRECAUCIÓN',
        description: 'BTC infravalorado pero hay miedo en mercado',
        colorClass: 'text-warning',
        bgClass: 'bg-warning/10 border-warning/30'
      };
    }
    
    // Máximo riesgo: BTC sobrevalorado + pánico
    if (ratio > 2.0 && usdtTrend === 'up') {
      return {
        level: 'maximum-risk',
        emoji: '🔴🔴',
        title: 'MÁXIMO RIESGO',
        description: 'BTC sobrevalorado + Pánico en mercado',
        colorClass: 'text-danger',
        bgClass: 'bg-danger/10 border-danger/30'
      };
    }
    
    // Riesgo: BTC sobrevalorado
    if (ratio > 2.0) {
      return {
        level: 'risk',
        emoji: '🔴',
        title: 'ALTO RIESGO',
        description: 'BTC significativamente sobrevalorado',
        colorClass: 'text-danger',
        bgClass: 'bg-danger/10 border-danger/20'
      };
    }
    
    // Neutral: Condiciones mixtas
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
      <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 rounded-lg p-2">
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
            {usdtTrend === 'up' ? '↗️ Subiendo' : 
             usdtTrend === 'down' ? '↘️ Bajando' : 
             '→ Estable'}
          </span>
        </div>
      </div>
    </Card>
  );
}
