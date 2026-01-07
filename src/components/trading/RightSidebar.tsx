import { TrendingUp, Target, Percent, Bot } from "lucide-react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { PowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";

interface RightSidebarProps {
  analysis: PowerLawAnalysis;
}

export function RightSidebar({ analysis }: RightSidebarProps) {
  return (
    <aside className="w-80 bg-background border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Card 1: Precio Actual */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-bitcoin" />
          <span className="text-sm font-medium text-muted-foreground">Precio Actual</span>
        </div>
        <div className="text-3xl font-bold text-foreground">
          ${analysis.btcPrice.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Bitcoin (BTC)
        </div>
      </Card>

      {/* Card 2: Fair Value (Modelo) */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-info" />
          <span className="text-sm font-medium text-muted-foreground">Fair Value (Modelo)</span>
        </div>
        <div className="text-3xl font-bold text-info">
          ${Math.round(analysis.precioModelo).toLocaleString()}
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
          </div>
          <span className="text-2xl font-bold text-foreground">{analysis.ratio.toFixed(2)}</span>
        </div>
        
        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-2 bg-secondary rounded-full relative overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-success via-info to-danger rounded-full"
              style={{ width: '100%' }}
            />
            <div 
              className="absolute top-1/2 w-3 h-3 bg-today rounded-full border-2 border-background"
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

      {/* Card 4: Recomendación IA (Destacada) */}
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
            <span className="text-lg font-bold text-primary">{Math.round(analysis.scoreTotal)}/100</span>
          </div>
        </div>

        {/* Scores individuales */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Oportunidad:</span>
            <span className="font-medium text-success">{analysis.scoreOportunidad}/100</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Seguridad:</span>
            <span className="font-medium text-info">{analysis.scoreSeguridad}/100</span>
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
