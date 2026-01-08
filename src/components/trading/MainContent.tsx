import { Card } from "./Card";
import { AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { AnimatedNumber } from "./AnimatedNumber";
import { PowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";
import { PowerLawChart } from "./PowerLawChart";

interface MainContentProps {
  analysis: PowerLawAnalysis;
  btcPrice: number;
}

export function MainContent({ analysis, btcPrice }: MainContentProps) {
  // Leverage scenarios for the table
  const leverageScenarios = [
    { leverage: 1.5, risk: 'Bajo', color: 'text-success', rec: '✅' },
    { leverage: 2, risk: 'Bajo', color: 'text-success', rec: '✅' },
    { leverage: 3, risk: 'Medio', color: 'text-warning', rec: '⚠️' },
    { leverage: 5, risk: 'Alto', color: 'text-bitcoin', rec: '❌' },
    { leverage: 10, risk: 'Muy Alto', color: 'text-danger', rec: '❌' }
  ];

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      {/* Power Law Chart */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Gráfico Power Law</h2>
        <PowerLawChart analysis={analysis} btcPrice={btcPrice} />
      </Card>

      {/* Risk Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-warning" />
          Riesgo y Apalancamiento
        </h2>
        
        {/* 1. Cards de Posición Recomendada */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card: Colateral */}
          <Card>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <span>Colateral</span>
              <InfoTooltip content="Cantidad de BTC a depositar como garantía del préstamo. Se calcula como % del portfolio según la zona de valoración." />
            </div>
            <div className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={Math.round(analysis.colateralUSD)} prefix="$" />
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
              <AnimatedNumber value={Math.round(analysis.prestamoUSD)} prefix="$" />
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

        {/* 2. Precios Críticos */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-danger" />
            Precios de Seguridad
          </h3>
          
          <div className="space-y-4">
            {/* Margin Call */}
            <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div>
                <div className="text-sm text-muted-foreground">Margin Call (85% LTV)</div>
                <div className="text-xl font-bold text-warning">
                  <AnimatedNumber value={Math.round(analysis.precioMarginCall)} prefix="$" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Caída necesaria</div>
                <div className="text-sm text-warning">
                  -{((1 - analysis.precioMarginCall / btcPrice) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            {/* Liquidación */}
            <div className="flex justify-between items-center p-3 bg-danger/10 rounded-lg border border-danger/20">
              <div>
                <div className="text-sm text-muted-foreground">Liquidación (91% LTV)</div>
                <div className="text-xl font-bold text-danger">
                  <AnimatedNumber value={Math.round(analysis.precioLiquidacion)} prefix="$" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Caída necesaria</div>
                <div className="text-sm text-danger">
                  -{((1 - analysis.precioLiquidacion / btcPrice) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            {/* Piso del Modelo */}
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div>
                <div className="text-sm text-muted-foreground">Piso Modelo (0.5x)</div>
                <div className="text-xl font-bold text-foreground">
                  ${Math.round(analysis.piso).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Margen de seguridad</div>
                <div className={`text-sm ${
                  analysis.precioLiquidacion > analysis.piso ? 'text-success' : 'text-danger'
                }`}>
                  {analysis.piso > 0 ? ((analysis.precioLiquidacion - analysis.piso) / analysis.piso * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra visual */}
          <div className="mt-6">
            <div className="h-3 bg-muted rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-danger via-warning to-success" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Piso</span>
              <span>Liquidación</span>
              <span>Margin Call</span>
              <span>Actual</span>
            </div>
          </div>
        </Card>

        {/* 3. Escenarios a 6 Meses */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            📊 Proyección 6 Meses
          </h3>
          
          <div className="p-4 bg-info/10 rounded-lg border border-info/30">
            <p className="text-sm text-muted-foreground mb-3">
              Si BTC alcanza fair value (${Math.round(analysis.precioModelo).toLocaleString()})
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Retorno Bruto</div>
                <div className="text-xl font-bold text-success">
                  +${Math.round(analysis.gananciaNeta + analysis.costoIntereses6m).toLocaleString()}
                </div>
                <div className="text-xs text-success">
                  ({(analysis.retornoPorcentaje + (analysis.costoIntereses6m / analysis.colateralUSD * 100)).toFixed(1)}%)
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Costo Interés (6m)</div>
                <div className="text-lg text-danger">
                  -${analysis.costoIntereses6m.toFixed(0)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Ganancia Neta</div>
                <div className="text-2xl font-bold text-info">
                  ${Math.round(analysis.gananciaNeta).toLocaleString()}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Probabilidad</div>
                <div className="text-lg text-success">
                  {analysis.ratio < 0.8 ? '70%' : analysis.ratio < 1.2 ? '50%' : '30%'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {analysis.ratio < 0.8 ? 'Alta' : analysis.ratio < 1.2 ? 'Media' : 'Baja'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 4. Tabla de Apalancamiento */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-info" />
            Escenarios de Apalancamiento (LONG)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-muted-foreground font-medium">Apal.</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Liquidación</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Caída %</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Riesgo</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Rec.</th>
                </tr>
              </thead>
              <tbody>
                {leverageScenarios.map(({ leverage, risk, color, rec }) => {
                  const liquidacion = btcPrice * (1 - 1/leverage);
                  const caida = ((1 - liquidacion / btcPrice) * 100);
                  
                  return (
                    <tr key={leverage} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 text-foreground font-medium">{leverage}x</td>
                      <td className="py-3 text-foreground">
                        ${Math.round(liquidacion).toLocaleString()}
                      </td>
                      <td className="py-3 text-foreground">
                        -{caida.toFixed(0)}%
                      </td>
                      <td className={`py-3 ${color} font-medium`}>{risk}</td>
                      <td className="py-3 text-center text-xl">{rec}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Recomendación actual:</strong> Para ratio {analysis.ratio.toFixed(2)}, 
              usar apalancamiento <span className="text-info font-medium">{analysis.apalancamientoSugerido}</span> ({analysis.apalancamientoRiesgo} riesgo)
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
