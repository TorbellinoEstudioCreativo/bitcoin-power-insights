import { useState, useEffect } from "react";
import { Card } from "./Card";
import { AlertTriangle, TrendingDown, BarChart3, TrendingUp } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { AnimatedNumber } from "./AnimatedNumber";
import { PowerLawAnalysis, Estrategia } from "@/hooks/usePowerLawAnalysis";
import { PowerLawChart } from "./PowerLawChart";

interface MainContentProps {
  analysis: PowerLawAnalysis;
  btcPrice: number;
}

export function MainContent({ analysis, btcPrice }: MainContentProps) {
  const [estrategia, setEstrategia] = useState<Estrategia>(analysis.estrategiaRecomendada);

  // Auto-select recommended strategy when ratio changes significantly
  useEffect(() => {
    setEstrategia(analysis.estrategiaRecomendada);
  }, [analysis.estrategiaRecomendada]);

  const isRecommended = estrategia === analysis.estrategiaRecomendada;

  // Leverage scenarios for the table - adapt based on strategy
  const leverageScenariosLong = [
    { leverage: 1.5, risk: 'Bajo', color: 'text-success', rec: '✅' },
    { leverage: 2, risk: 'Bajo', color: 'text-success', rec: '✅' },
    { leverage: 3, risk: 'Medio', color: 'text-warning', rec: '⚠️' },
    { leverage: 5, risk: 'Alto', color: 'text-bitcoin', rec: '❌' },
    { leverage: 10, risk: 'Muy Alto', color: 'text-danger', rec: '❌' }
  ];

  const leverageScenariosShort = [
    { leverage: 2, risk: 'Bajo', color: 'text-success', rec: '✅' },
    { leverage: 3, risk: 'Medio', color: 'text-warning', rec: '⚠️' },
    { leverage: 5, risk: 'Alto', color: 'text-bitcoin', rec: '❌' },
    { leverage: 10, risk: 'Muy Alto', color: 'text-danger', rec: '❌' }
  ];

  const leverageScenarios = estrategia === 'LONG' ? leverageScenariosLong : leverageScenariosShort;

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

        {/* Strategy Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card rounded-lg border border-border">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Estrategia Seleccionada
            </h4>
            <p className={`text-xs ${isRecommended ? 'text-success' : 'text-warning'}`}>
              {isRecommended 
                ? '✅ Recomendada según ratio actual'
                : '⚠️ No recomendada - Solo para análisis'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setEstrategia('LONG')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                estrategia === 'LONG'
                  ? 'bg-success text-success-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              LONG
            </button>
            
            <button
              onClick={() => setEstrategia('SHORT')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                estrategia === 'SHORT'
                  ? 'bg-danger text-danger-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              SHORT
            </button>
          </div>
        </div>

        {/* Warning if not recommended */}
        {!isRecommended && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h4 className="font-bold text-warning">
                Estrategia No Recomendada
              </h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {estrategia === 'LONG' && analysis.ratio > 2.0 && (
                <>
                  Bitcoin está <strong className="text-danger">{((analysis.ratio - 1) * 100).toFixed(0)}% 
                  sobre el fair value</strong>. Abrir un LONG en este momento tiene alto riesgo de 
                  corrección. La estrategia recomendada es <strong className="text-danger">SHORT</strong>.
                </>
              )}
              {estrategia === 'SHORT' && analysis.ratio < 1.2 && (
                <>
                  Bitcoin está <strong className="text-success">cerca o bajo el fair value</strong>. 
                  Abrir un SHORT en este momento tiene bajo potencial de ganancia. La estrategia 
                  recomendada es <strong className="text-success">LONG</strong>.
                </>
              )}
            </p>
          </div>
        )}
        
        {/* Position Cards - Conditional based on strategy */}
        {estrategia === 'LONG' ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card: Colateral SHORT */}
            <Card>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <span>Colateral SHORT</span>
                <InfoTooltip content="Cantidad USD a depositar como garantía para la posición corta." />
              </div>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedNumber value={Math.round(analysis.posicionShort.colateralShort)} prefix="$" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analysis.posicionShort.porcentajeShort}% del portfolio
              </div>
            </Card>

            {/* Card: Exposición SHORT */}
            <Card>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <span>Exposición SHORT</span>
                <InfoTooltip content="Valor total de la posición corta apalancada." />
              </div>
              <div className="text-2xl font-bold text-danger">
                <AnimatedNumber value={Math.round(analysis.posicionShort.exposicionShort)} prefix="$" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analysis.posicionShort.btcShortAmount.toFixed(4)} BTC
              </div>
              <div className="text-xs text-info mt-1">
                Apal: {analysis.posicionShort.apalancamientoShort}x
              </div>
            </Card>

            {/* Card: Ganancia si baja */}
            <Card>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <span>Ganancia si baja a Modelo</span>
                <InfoTooltip content="Ganancia potencial si el precio baja al fair value del Power Law." />
              </div>
              <div className="text-2xl font-bold text-success">
                +<AnimatedNumber value={Math.round(analysis.posicionShort.gananciaSiBajaModelo)} prefix="$" />
              </div>
              <div className="text-xs text-success mt-1">
                {analysis.posicionShort.retornoShort.toFixed(1)}% retorno
              </div>
            </Card>

            {/* Card: Stop Loss */}
            <Card>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <span>Stop Loss (Liquidación)</span>
                <InfoTooltip content="Si el precio SUBE a este nivel, la posición se liquida." />
              </div>
              <div className="text-2xl font-bold text-danger">
                <AnimatedNumber value={Math.round(analysis.posicionShort.precioLiquidacionShort)} prefix="$" />
              </div>
              <div className="text-xs text-danger mt-1">
                +{((analysis.posicionShort.precioLiquidacionShort - btcPrice) / btcPrice * 100).toFixed(1)}% subida
              </div>
            </Card>
          </div>
        )}

        {/* 2. Precios Críticos */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            {estrategia === 'LONG' ? (
              <TrendingDown className="w-5 h-5 text-danger" />
            ) : (
              <TrendingUp className="w-5 h-5 text-danger" />
            )}
            Precios de Seguridad ({estrategia})
          </h3>
          
          <div className="space-y-4">
            {estrategia === 'LONG' ? (
              <>
                {/* Margin Call LONG */}
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
                
                {/* Liquidación LONG */}
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
              </>
            ) : (
              <>
                {/* Margin Call SHORT */}
                <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <div className="text-sm text-muted-foreground">Margin Call SHORT</div>
                    <div className="text-xl font-bold text-warning">
                      <AnimatedNumber value={Math.round(analysis.posicionShort.precioMarginCallShort)} prefix="$" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Subida necesaria</div>
                    <div className="text-sm text-warning">
                      +{((analysis.posicionShort.precioMarginCallShort / btcPrice - 1) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                {/* Liquidación SHORT */}
                <div className="flex justify-between items-center p-3 bg-danger/10 rounded-lg border border-danger/20">
                  <div>
                    <div className="text-sm text-muted-foreground">Liquidación SHORT</div>
                    <div className="text-xl font-bold text-danger">
                      <AnimatedNumber value={Math.round(analysis.posicionShort.precioLiquidacionShort)} prefix="$" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Subida necesaria</div>
                    <div className="text-sm text-danger">
                      +{((analysis.posicionShort.precioLiquidacionShort / btcPrice - 1) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Piso/Techo del Modelo */}
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
              <div>
                <div className="text-sm text-muted-foreground">
                  {estrategia === 'LONG' ? 'Piso Modelo (0.5x)' : 'Techo Modelo (3x)'}
                </div>
                <div className="text-xl font-bold text-foreground">
                  ${Math.round(estrategia === 'LONG' ? analysis.piso : analysis.techo).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  {estrategia === 'LONG' ? 'Margen de seguridad' : 'Potencial alcista'}
                </div>
                <div className={`text-sm ${
                  estrategia === 'LONG' 
                    ? (analysis.precioLiquidacion > analysis.piso ? 'text-success' : 'text-danger')
                    : 'text-info'
                }`}>
                  {estrategia === 'LONG'
                    ? `${analysis.piso > 0 ? ((analysis.precioLiquidacion - analysis.piso) / analysis.piso * 100).toFixed(1) : 0}%`
                    : `+${((analysis.techo / btcPrice - 1) * 100).toFixed(0)}%`
                  }
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra visual */}
          <div className="mt-6">
            <div className="h-3 bg-muted rounded-full relative overflow-hidden">
              <div className={`absolute inset-0 ${
                estrategia === 'LONG' 
                  ? 'bg-gradient-to-r from-danger via-warning to-success'
                  : 'bg-gradient-to-r from-success via-warning to-danger'
              }`} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              {estrategia === 'LONG' ? (
                <>
                  <span>Piso</span>
                  <span>Liquidación</span>
                  <span>Margin Call</span>
                  <span>Actual</span>
                </>
              ) : (
                <>
                  <span>Actual</span>
                  <span>Margin Call</span>
                  <span>Liquidación</span>
                  <span>Techo</span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* 3. Escenarios a 6 Meses */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            📊 Proyección 6 Meses ({estrategia})
          </h3>
          
          <div className={`p-4 rounded-lg border ${
            estrategia === 'LONG' ? 'bg-info/10 border-info/30' : 'bg-danger/10 border-danger/30'
          }`}>
            <p className="text-sm text-muted-foreground mb-3">
              {estrategia === 'LONG' 
                ? `Si BTC sube a fair value ($${Math.round(analysis.precioModelo).toLocaleString()})`
                : `Si BTC baja a fair value ($${Math.round(analysis.precioModelo).toLocaleString()})`
              }
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {estrategia === 'LONG' ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground">Ganancia Potencial</div>
                    <div className="text-xl font-bold text-success">
                      +${Math.round(analysis.posicionShort.gananciaSiBajaModelo).toLocaleString()}
                    </div>
                    <div className="text-xs text-success">
                      ({analysis.posicionShort.retornoShort.toFixed(1)}%)
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Colateral en Riesgo</div>
                    <div className="text-lg text-warning">
                      ${Math.round(analysis.posicionShort.colateralShort).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Ratio Actual</div>
                    <div className="text-2xl font-bold text-danger">
                      {analysis.ratio.toFixed(2)}x
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((analysis.ratio - 1) * 100).toFixed(0)}% sobre fair value
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Probabilidad</div>
                    <div className="text-lg text-success">
                      {analysis.ratio > 2.5 ? '60%' : analysis.ratio > 2.0 ? '40%' : '20%'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {analysis.ratio > 2.5 ? 'Alta' : analysis.ratio > 2.0 ? 'Media' : 'Baja'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* 4. Tabla de Apalancamiento */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-info" />
            Escenarios de Apalancamiento ({estrategia})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-muted-foreground font-medium">Apal.</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Liquidación</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">
                    {estrategia === 'LONG' ? 'Caída %' : 'Subida %'}
                  </th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Riesgo</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Rec.</th>
                </tr>
              </thead>
              <tbody>
                {leverageScenarios.map(({ leverage, risk, color, rec }) => {
                  const liquidacion = estrategia === 'LONG'
                    ? btcPrice * (1 - 1/leverage)
                    : btcPrice * (1 + 1/leverage);
                  const change = estrategia === 'LONG'
                    ? ((1 - liquidacion / btcPrice) * 100)
                    : ((liquidacion / btcPrice - 1) * 100);
                  
                  return (
                    <tr key={leverage} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 text-foreground font-medium">{leverage}x</td>
                      <td className="py-3 text-foreground">
                        ${Math.round(liquidacion).toLocaleString()}
                      </td>
                      <td className="py-3 text-foreground">
                        {estrategia === 'LONG' ? '-' : '+'}{change.toFixed(0)}%
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
              {estrategia === 'LONG' ? (
                <> usar apalancamiento <span className="text-info font-medium">{analysis.apalancamientoSugerido}</span> ({analysis.apalancamientoRiesgo} riesgo)</>
              ) : (
                <> usar apalancamiento <span className="text-danger font-medium">{analysis.posicionShort.apalancamientoShort}x</span> (conservador para SHORT)</>
              )}
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
