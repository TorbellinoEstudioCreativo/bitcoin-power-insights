import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Activity, Target, Zap } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { USDTDominanceData } from '@/lib/usdtDominance';

interface USDTDominanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: USDTDominanceData;
}

export function USDTDominanceModal({ open, onOpenChange, data }: USDTDominanceModalProps) {
  // Preparar datos para el gráfico de 7 días
  const chartData = prepareChartData();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            💰 USDT Dominance - Análisis Detallado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          {/* Sección 1: Valor Actual y Régimen */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-secondary/30 rounded-lg">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {data.dominance.toFixed(2)}%
              </p>
              <p className="text-sm text-muted-foreground">Valor actual</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getRegimeColorClasses(data.regime.level)}`}>
              <span className="text-xl">{data.regime.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{data.regime.label}</p>
                <p className="text-xs opacity-80">{data.regime.description}</p>
              </div>
            </div>
          </div>
          
          {/* Sección 2: Cambios en el Tiempo */}
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Cambios en el tiempo
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <ChangeItem label="1 hora" value={data.metrics.change1h} />
              <ChangeItem label="24 horas" value={data.metrics.change24h} />
              <ChangeItem label="7 días" value={data.metrics.change7d} />
            </div>
          </div>
          
          {/* Sección 3: Contexto Histórico */}
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Contexto Histórico (7 días)
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatBox label="Mínimo" value={`${data.metrics.min7d.toFixed(2)}%`} color="text-success" />
              <StatBox label="Promedio" value={`${data.metrics.avg7d.toFixed(2)}%`} color="text-info" />
              <StatBox label="Actual" value={`${data.dominance.toFixed(2)}%`} color="text-foreground" highlight />
              <StatBox label="Máximo" value={`${data.metrics.max7d.toFixed(2)}%`} color="text-danger" />
            </div>
            
            <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Percentil:</span>
              <span className="font-semibold text-foreground">
                {data.metrics.percentile}% 
                <span className="text-muted-foreground ml-1">
                  (más {data.metrics.percentile > 50 ? 'alto' : 'bajo'} que {data.metrics.percentile}% de la semana)
                </span>
              </span>
            </div>
          </div>
          
          {/* Sección 4: Gráfico de 7 Días */}
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              📈 Tendencia - Últimos 7 días
            </h3>
            
            {chartData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="dominanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Dominancia']}
                    />
                    <Area
                      type="monotone"
                      dataKey="dominance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#dominanceGradient)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No hay suficientes datos históricos aún. Los datos se acumularán con el tiempo.
              </div>
            )}
          </div>
          
          {/* Sección 5: Correlación con BTC */}
          {data.btcCorrelation.btcChange24h !== null && (
            <div className="p-4 bg-secondary/20 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                🔍 Correlación con BTC
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">BTC (24h)</p>
                  <div className={`flex items-center justify-center gap-1 text-lg font-bold ${
                    data.btcCorrelation.btcChange24h > 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {data.btcCorrelation.btcChange24h > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {data.btcCorrelation.btcChange24h.toFixed(2)}%
                  </div>
                </div>
                
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">USDT Dom (24h)</p>
                  <div className={`flex items-center justify-center gap-1 text-lg font-bold ${
                    data.metrics.change24h > 0 ? 'text-danger' : 'text-success'
                  }`}>
                    {data.metrics.change24h > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {data.metrics.change24h > 0 ? '+' : ''}{data.metrics.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className={`flex items-center gap-3 p-3 rounded-lg ${getPatternBgColor(data.btcCorrelation.pattern)}`}>
                <span className="text-2xl">{data.btcCorrelation.patternEmoji}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Patrón: {data.btcCorrelation.patternLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getPatternDescription(data.btcCorrelation.pattern)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Sección 6: Velocidad de Cambio */}
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Velocidad de Cambio
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Velocidad:</p>
                <p className="text-sm font-semibold text-foreground">
                  {data.metrics.velocity > 0 ? '+' : ''}{data.metrics.velocity.toFixed(3)}% / hora
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado:</p>
                <p className="text-sm font-semibold">
                  {getVelocityDisplay(data.metrics.velocityLabel)}
                </p>
              </div>
            </div>
            
            {Math.abs(data.metrics.velocity) > 0.005 && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  Si continúa a este ritmo:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">En 24 horas:</span>
                    <span className="font-medium text-foreground">
                      {(data.dominance + data.metrics.velocity * 24).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">En 3 días:</span>
                    <span className="font-medium text-foreground">
                      {(data.dominance + data.metrics.velocity * 72).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Componentes auxiliares
// ============================================

function ChangeItem({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0.01;
  const isNegative = value < -0.01;
  
  return (
    <div className="text-center p-2 bg-muted/30 rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className={`flex items-center justify-center gap-1 text-sm font-semibold ${
        isPositive ? 'text-danger' : isNegative ? 'text-success' : 'text-muted-foreground'
      }`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : 
         isNegative ? <TrendingDown className="w-3 h-3" /> : 
         <Minus className="w-3 h-3" />}
        {value > 0 ? '+' : ''}{value.toFixed(2)}%
      </div>
    </div>
  );
}

function StatBox({ label, value, color, highlight }: { 
  label: string; 
  value: string; 
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`text-center p-2 rounded-lg ${highlight ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ============================================
// Funciones auxiliares
// ============================================

function prepareChartData() {
  try {
    const historyStr = localStorage.getItem('usdt-dominance-extended-history');
    if (!historyStr) return [];
    
    const history = JSON.parse(historyStr);
    
    // Filtrar últimos 7 días
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const last7d = history.filter((h: { timestamp: number }) => h.timestamp > sevenDaysAgo);
    
    if (last7d.length === 0) return [];
    
    // Agrupar en buckets de 6 horas para tener ~28 puntos
    const buckets: { [key: string]: number[] } = {};
    
    last7d.forEach((entry: { timestamp: number; dominance: number }) => {
      const date = new Date(entry.timestamp);
      const dayKey = `${date.getMonth() + 1}/${date.getDate()}`;
      const hourBlock = Math.floor(date.getHours() / 6) * 6;
      const key = `${dayKey} ${hourBlock}h`;
      
      if (!buckets[key]) {
        buckets[key] = [];
      }
      buckets[key].push(entry.dominance);
    });
    
    // Ordenar por timestamp y promediar
    const sortedKeys = Object.keys(buckets).sort((a, b) => {
      const parseKey = (k: string) => {
        const [datePart, hourPart] = k.split(' ');
        const [month, day] = datePart.split('/').map(Number);
        const hour = parseInt(hourPart);
        return month * 10000 + day * 100 + hour;
      };
      return parseKey(a) - parseKey(b);
    });
    
    return sortedKeys.map(key => {
      const values = buckets[key];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      // Simplificar etiqueta para el gráfico
      const [datePart] = key.split(' ');
      return {
        date: datePart,
        dominance: avg
      };
    });
  } catch (error) {
    console.error('Error preparing chart data:', error);
    return [];
  }
}

function getPatternDescription(pattern: string): string {
  switch (pattern) {
    case 'rotacion_defensiva':
      return 'Los traders están vendiendo crypto y refugiándose en USDT. Señal bajista.';
    case 'entrada_capital':
      return 'Los traders están comprando crypto con su USDT. Señal alcista.';
    case 'divergencia':
      return 'Movimientos inusuales - BTC y USDT Dom se mueven en la misma dirección.';
    default:
      return 'No hay un patrón claro de correlación en este momento.';
  }
}

function getPatternBgColor(pattern: string): string {
  switch (pattern) {
    case 'rotacion_defensiva':
      return 'bg-danger/10';
    case 'entrada_capital':
      return 'bg-success/10';
    case 'divergencia':
      return 'bg-warning/10';
    default:
      return 'bg-muted/30';
  }
}

function getVelocityDisplay(label: string): string {
  switch (label) {
    case 'rápido':
      return '🔴 Rápida (Alerta)';
    case 'medio':
      return '🟡 Media';
    case 'lento':
      return '🔵 Lenta';
    default:
      return '🟢 Estable';
  }
}

function getRegimeColorClasses(level: string): string {
  switch (level) {
    case 'extremo_alcista':
    case 'alcista':
      return 'bg-success/20 text-success border-success/30';
    case 'neutral':
      return 'bg-info/20 text-info border-info/30';
    case 'bajista':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'extremo_bajista':
      return 'bg-danger/20 text-danger border-danger/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
