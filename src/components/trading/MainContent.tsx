import { Card } from "./Card";
import { AlertTriangle } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { PowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";

interface MainContentProps {
  analysis: PowerLawAnalysis;
}

export function MainContent({ analysis }: MainContentProps) {
  return (
    <main className="flex-1 p-6 overflow-y-auto">
      {/* Chart Placeholder */}
      <Card className="h-[500px] flex items-center justify-center mb-8">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-lg font-medium">Gráfico Power Law</p>
          <p className="text-sm">Se implementará en Fase 4</p>
        </div>
      </Card>

      {/* Risk Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-warning" />
          Riesgo y Apalancamiento
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card: Colateral */}
          <Card>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <span>Colateral</span>
              <InfoTooltip content="Cantidad de BTC a depositar como garantía del préstamo. Se calcula como % del portfolio según la zona de valoración." />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${Math.round(analysis.colateralUSD).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {analysis.porcentajePortfolio}% del portfolio
            </div>
            <div className="text-xs text-info mt-1">
              {analysis.colateralBTC.toFixed(4)} BTC
            </div>
          </Card>

          {/* Card: Préstamo */}
          <Card>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <span>Préstamo</span>
              <InfoTooltip content="Loan-to-Value: porcentaje del colateral que puedes pedir prestado. Mayor LTV = mayor riesgo de liquidación." />
            </div>
            <div className="text-2xl font-bold text-success">
              ${Math.round(analysis.prestamoUSD).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              LTV: {(analysis.ltvAjustado * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Tasa: 5.37% anual
            </div>
          </Card>

          {/* Card: BTC Extra */}
          <Card>
            <div className="text-sm text-muted-foreground mb-1">BTC Adicional</div>
            <div className="text-2xl font-bold text-bitcoin">
              {analysis.compraBTC.toFixed(4)} BTC
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ${Math.round(analysis.prestamoUSD).toLocaleString()}
            </div>
          </Card>

          {/* Card: Exposición Total */}
          <Card>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <span>Exposición Total</span>
              <InfoTooltip content="Tu posición total en BTC = Colateral + BTC comprado con el préstamo." />
            </div>
            <div className="text-2xl font-bold text-primary">
              {analysis.exposicionTotal.toFixed(4)} BTC
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ${Math.round(analysis.exposicionTotal * analysis.btcPrice).toLocaleString()}
            </div>
            <div className="text-xs text-info mt-1">
              Apalancamiento: {analysis.apalancamiento.toFixed(2)}x
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
