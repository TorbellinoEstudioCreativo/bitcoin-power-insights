import { Card } from "./Card";
import { OrdenesCompraResult } from "@/hooks/useTradingOrders";
import { useLanguage } from "@/contexts/LanguageContext";

interface BuyOrdersPanelProps {
  ordenesCompra: OrdenesCompraResult;
  precioActual: number;
}

export function BuyOrdersPanel({ ordenesCompra, precioActual }: BuyOrdersPanelProps) {
  const { language } = useLanguage();
  
  const getRecommendationStyle = () => {
    switch (ordenesCompra.recomendacion) {
      case 'COMPRAR_EN_NIVELES':
        return 'bg-success/10 border-success/30 text-success';
      case 'NO_COMPRAR':
        return 'bg-danger/10 border-danger/30 text-danger';
      default:
        return 'bg-warning/10 border-warning/30 text-warning';
    }
  };
  
  const getRecommendationText = () => {
    if (language === 'es') {
      switch (ordenesCompra.recomendacion) {
        case 'COMPRAR_EN_NIVELES': return 'COMPRAR EN NIVELES';
        case 'NO_COMPRAR': return 'NO COMPRAR';
        default: return 'ESPERAR';
      }
    } else {
      switch (ordenesCompra.recomendacion) {
        case 'COMPRAR_EN_NIVELES': return 'BUY AT LEVELS';
        case 'NO_COMPRAR': return 'DO NOT BUY';
        default: return 'WAIT';
      }
    }
  };
  
  return (
    <Card className="p-4 border-2 border-success/50">
      <h3 className="text-lg font-bold text-success mb-4 flex items-center gap-2">
        🎯 {language === 'es' ? 'Niveles de Compra Óptimos' : 'Optimal Buy Levels'}
      </h3>
      
      {/* Recommendation Badge */}
      <div className={`p-2 rounded-lg border mb-4 ${getRecommendationStyle()}`}>
        <div className="font-bold text-sm">{getRecommendationText()}</div>
        <div className="text-xs opacity-80">{ordenesCompra.razon}</div>
      </div>
      
      {/* Current Price Reference */}
      <div className="mb-4 p-2 bg-bitcoin/10 rounded-lg border-l-4 border-bitcoin">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {language === 'es' ? 'Precio Actual' : 'Current Price'}
          </span>
          <span className="text-lg font-bold text-bitcoin">
            ${precioActual.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Buy Orders */}
      <div className="space-y-2">
        {ordenesCompra.ordenes.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            {language === 'es' 
              ? 'Sin órdenes de compra sugeridas'
              : 'No buy orders suggested'}
          </div>
        ) : (
          ordenesCompra.ordenes.map((orden) => (
            <div 
              key={orden.nivel}
              className="p-3 rounded-lg bg-success/10 border border-success/30"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-success">#{orden.nivel}</span>
                  <span className="text-sm font-bold text-foreground">
                    ${orden.precio.toLocaleString()}
                  </span>
                  {/* Confluence badge */}
                  {orden.esConfluencia && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 font-bold">
                      ⭐ {language === 'es' ? 'Confluencia' : 'Confluence'}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-success font-bold">
                    -{orden.distancia.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Score: {orden.score}
                  </div>
                </div>
              </div>
              
              {/* Indicators badges */}
              <div className="flex flex-wrap gap-1 mb-2">
                {orden.indicadores && orden.indicadores.length > 0 ? (
                  orden.indicadores.map((ind, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        {ind.nombre}
                      </span>
                      {ind.timeframe && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          ind.timeframe === '1D' 
                            ? 'bg-success/20 text-success border-success/50'
                            : ind.timeframe === '1W'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                            : ind.timeframe === 'PSYCH'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                            : 'bg-info/20 text-info border-info/50'
                        }`}>
                          [{ind.timeframe}]
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    {orden.timeframe && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/20 text-info">
                        [{orden.timeframe}]
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                      {orden.nombre}
                    </span>
                  </>
                )}
                {orden.toques && orden.toques > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {orden.toques} {language === 'es' ? 'toques' : 'touches'}
                  </span>
                )}
              </div>
              
              {/* Confluence indicator count */}
              {orden.esConfluencia && orden.indicadores && (
                <div className="text-[10px] text-yellow-400 mb-2">
                  • {orden.indicadores.length} {language === 'es' ? 'indicadores coinciden' : 'indicators match'}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                <div>
                  <span className="text-muted-foreground">
                    {language === 'es' ? 'Invertir:' : 'Invest:'}
                  </span>
                  <span className="ml-1 font-mono text-foreground">
                    ${orden.montoUSDT.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">BTC:</span>
                  <span className="ml-1 font-mono text-foreground">
                    {orden.btcAmount.toFixed(6)}
                  </span>
                </div>
              </div>
              
              <div className="text-[10px] text-muted-foreground">
                {orden.razon}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
