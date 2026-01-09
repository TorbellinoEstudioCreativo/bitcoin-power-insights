import { Card } from "./Card";
import { OrdenesVentaResult } from "@/hooks/useTradingOrders";
import { useLanguage } from "@/contexts/LanguageContext";

interface SellOrdersPanelProps {
  ordenesVenta: OrdenesVentaResult;
  precioActual: number;
  precioEntrada: number;
}

export function SellOrdersPanel({ ordenesVenta, precioActual, precioEntrada }: SellOrdersPanelProps) {
  const { language } = useLanguage();
  
  const getStrategyStyle = () => {
    switch (ordenesVenta.estrategia) {
      case 'CONSERVADOR':
        return 'bg-success/10 border-success/30 text-success';
      case 'BALANCEADO':
        return 'bg-info/10 border-info/30 text-info';
      case 'REDUCIR':
        return 'bg-warning/10 border-warning/30 text-warning';
      case 'SALIR':
        return 'bg-danger/10 border-danger/30 text-danger';
    }
  };
  
  const getStrategyText = () => {
    if (language === 'es') {
      switch (ordenesVenta.estrategia) {
        case 'CONSERVADOR': return 'CONSERVADOR';
        case 'BALANCEADO': return 'BALANCEADO';
        case 'REDUCIR': return 'REDUCIR POSICIÓN';
        case 'SALIR': return 'SALIR COMPLETAMENTE';
      }
    } else {
      switch (ordenesVenta.estrategia) {
        case 'CONSERVADOR': return 'CONSERVATIVE';
        case 'BALANCEADO': return 'BALANCED';
        case 'REDUCIR': return 'REDUCE POSITION';
        case 'SALIR': return 'EXIT COMPLETELY';
      }
    }
  };
  
  const currentPnL = precioEntrada > 0 
    ? ((precioActual - precioEntrada) / precioEntrada) * 100 
    : 0;
  
  return (
    <Card className="p-4 border-2 border-danger/50">
      <h3 className="text-lg font-bold text-danger mb-4 flex items-center gap-2">
        🎯 {language === 'es' ? 'Take-Profit Escalonado' : 'Scaled Take-Profit'}
      </h3>
      
      {/* Strategy Badge */}
      <div className={`p-2 rounded-lg border mb-4 ${getStrategyStyle()}`}>
        <div className="font-bold text-sm">
          {language === 'es' ? 'Estrategia:' : 'Strategy:'} {getStrategyText()}
        </div>
        <div className="text-xs opacity-80">
          {language === 'es' 
            ? `Vender ${ordenesVenta.porcentajeTotal}% de la posición`
            : `Sell ${ordenesVenta.porcentajeTotal}% of position`}
        </div>
      </div>
      
      {/* Entry Price and Current P&L */}
      <div className="mb-4 p-2 bg-muted/30 rounded-lg">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            {language === 'es' ? 'Precio Entrada:' : 'Entry Price:'}
          </span>
          <span className="font-mono text-foreground">
            ${precioEntrada.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-muted-foreground">
            {language === 'es' ? 'P&L Actual:' : 'Current P&L:'}
          </span>
          <span className={`font-mono font-bold ${currentPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(2)}%
          </span>
        </div>
      </div>
      
      {/* Sell Orders */}
      <div className="space-y-2">
        {ordenesVenta.ordenes.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            {language === 'es' 
              ? 'Sin órdenes de venta sugeridas'
              : 'No sell orders suggested'}
          </div>
        ) : (
          ordenesVenta.ordenes.map((orden) => (
            <div 
              key={orden.nivel}
              className="p-3 rounded-lg bg-secondary border border-border"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-danger">#{orden.nivel}</span>
                  <span className="text-sm font-bold text-foreground">
                    ${orden.precio.toLocaleString()}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    {orden.nombre}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-success font-bold">
                    +{orden.retorno.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {orden.porcentaje}% {language === 'es' ? 'posición' : 'position'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                <div>
                  <span className="text-muted-foreground">
                    {language === 'es' ? 'Vender:' : 'Sell:'}
                  </span>
                  <span className="ml-1 font-mono text-foreground">
                    ${orden.cantidadUSDT.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {language === 'es' ? 'Ganancia:' : 'Profit:'}
                  </span>
                  <span className="ml-1 font-mono text-success">
                    +${orden.gananciaUSD.toLocaleString()}
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
      
      {/* Total Potential Gain */}
      {ordenesVenta.totalGanancia > 0 && (
        <div className="mt-4 p-3 bg-gradient-to-br from-danger/10 to-bitcoin/10 rounded-lg border border-danger/30">
          <div className="text-xs text-muted-foreground mb-1">
            {language === 'es' ? 'Ganancia Total Potencial' : 'Total Potential Profit'}
          </div>
          <div className="text-2xl font-bold text-success">
            +${ordenesVenta.totalGanancia.toLocaleString()} USD
          </div>
        </div>
      )}
    </Card>
  );
}
