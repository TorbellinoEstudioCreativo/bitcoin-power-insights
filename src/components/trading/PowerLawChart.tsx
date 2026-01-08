import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { PowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";
import { GENESIS_DATE } from "@/lib/constants";

interface PowerLawChartProps {
  analysis: PowerLawAnalysis;
  btcPrice: number;
}

type Timeframe = '15d' | '30d' | '3m' | '1y' | 'all';

interface ChartDataPoint {
  date: string;
  modelo: number;
  techo: number;
  piso: number;
  precioReal: number | null;
  isFuture?: boolean;
  isToday?: boolean;
}

// Power Law formula
const calcularPrecioPowerLaw = (years: number): number => {
  return Math.pow(10, -1.847796462) * Math.pow(years, 5.616314045);
};

// Historical prices for demo (approximate yearly averages)
const historicalPrices: Record<number, number> = {
  2013: 750, 2014: 600, 2015: 430, 2016: 950, 2017: 13850,
  2018: 6300, 2019: 7200, 2020: 19000, 2021: 47000,
  2022: 28000, 2023: 37000, 2024: 72000, 2025: 93000
};

export function PowerLawChart({ analysis, btcPrice }: PowerLawChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const generateChartData = (tf: Timeframe): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const currentQuarter = Math.floor(currentDate.getMonth() / 3);

    // Add current year with live price to historical prices
    const dynamicHistoricalPrices: Record<number, number> = {
      ...historicalPrices,
      [currentYear]: btcPrice
    };

    if (tf === 'all') {
      // Full view: QUARTERLY data for smooth curves
      for (let year = 2013; year <= 2037; year++) {
        for (let quarter = 0; quarter < 4; quarter++) {
          const month = quarter * 3;
          const date = new Date(year, month, 15);
          
          const days = Math.floor((date.getTime() - GENESIS_DATE.getTime()) / 86400000);
          const years = days / 365.25;
          const modelo = calcularPrecioPowerLaw(years);
          
          const isFuture = year > currentYear || (year === currentYear && quarter > currentQuarter);
          const isToday = year === currentYear && quarter === currentQuarter;
          
          let precioReal: number | null = null;
          if (!isFuture) {
            if (isToday) {
              precioReal = btcPrice;
            } else if (dynamicHistoricalPrices[year]) {
              // Add variation within the year
              const quarterVariation = (quarter - 1.5) * 0.15;
              precioReal = dynamicHistoricalPrices[year] * (1 + quarterVariation);
            }
          }
          
          data.push({
            date: quarter === 0 ? year.toString() : '',
            modelo: Math.round(modelo),
            techo: Math.round(modelo * 3.0),
            piso: Math.round(modelo * 0.5),
            precioReal: precioReal ? Math.round(precioReal) : null,
            isFuture,
            isToday
          });
        }
      }

      // Force HOY point with exact CoinGecko price
      const diasHoy = Math.floor((currentDate.getTime() - GENESIS_DATE.getTime()) / 86400000);
      const yearsHoy = diasHoy / 365.25;
      const modeloHoy = calcularPrecioPowerLaw(yearsHoy);

      const indiceHoy = data.findIndex(d => d.isToday);
      const puntoHoy: ChartDataPoint = {
        date: currentYear.toString(),
        modelo: Math.round(modeloHoy),
        techo: Math.round(modeloHoy * 3.0),
        piso: Math.round(modeloHoy * 0.5),
        precioReal: btcPrice,
        isFuture: false,
        isToday: true
      };

      if (indiceHoy >= 0) {
        data[indiceHoy] = puntoHoy;
      }

      // Ensure future points have no precioReal
      data.forEach(punto => {
        const yearStr = punto.date || '';
        const year = parseInt(yearStr) || 0;
        if (year > currentYear || (punto.isFuture && !punto.isToday)) {
          punto.precioReal = null;
        }
      });
    } else if (tf === '15d' || tf === '30d') {
      // Short term: DAILY data
      const days = tf === '15d' ? 15 : 30;
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - days);
      
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const daysSince = Math.floor((date.getTime() - GENESIS_DATE.getTime()) / 86400000);
        const yearsSince = daysSince / 365.25;
        const modelo = calcularPrecioPowerLaw(yearsSince);
        
        const isToday = date.toDateString() === currentDate.toDateString();
        const ratioActual = btcPrice / analysis.precioModelo;
        
        // Simulate price variation around current ratio
        const variation = (Math.random() - 0.5) * 0.08;
        const precioReal = isToday 
          ? btcPrice 
          : modelo * ratioActual * (1 + variation);
        
        data.push({
          date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          modelo: Math.round(modelo),
          techo: Math.round(modelo * 3.0),
          piso: Math.round(modelo * 0.5),
          precioReal: Math.round(precioReal),
          isToday
        });
      }
    } else if (tf === '3m') {
      // 3 months: WEEKLY data
      const weeks = 13;
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - weeks * 7);
      
      for (let i = 0; i <= weeks; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i * 7);
        
        const daysSince = Math.floor((date.getTime() - GENESIS_DATE.getTime()) / 86400000);
        const yearsSince = daysSince / 365.25;
        const modelo = calcularPrecioPowerLaw(yearsSince);
        
        const isToday = i === weeks;
        const ratioActual = btcPrice / analysis.precioModelo;
        
        const variation = (Math.random() - 0.5) * 0.1;
        const precioReal = isToday 
          ? btcPrice 
          : modelo * ratioActual * (1 + variation);
        
        data.push({
          date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          modelo: Math.round(modelo),
          techo: Math.round(modelo * 3.0),
          piso: Math.round(modelo * 0.5),
          precioReal: Math.round(precioReal),
          isToday
        });
      }
    } else if (tf === '1y') {
      // 1 year: MONTHLY data
      for (let i = 12; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        const daysSince = Math.floor((date.getTime() - GENESIS_DATE.getTime()) / 86400000);
        const yearsSince = daysSince / 365.25;
        const modelo = calcularPrecioPowerLaw(yearsSince);
        
        const isToday = i === 0;
        const ratioActual = btcPrice / analysis.precioModelo;
        
        const variation = (Math.random() - 0.5) * 0.12;
        const precioReal = isToday 
          ? btcPrice 
          : modelo * ratioActual * (1 + variation);
        
        data.push({
          date: date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
          modelo: Math.round(modelo),
          techo: Math.round(modelo * 3.0),
          piso: Math.round(modelo * 0.5),
          precioReal: Math.round(precioReal),
          isToday
        });
      }
    }

    return data;
  };

  const chartData = useMemo(() => generateChartData(timeframe), [timeframe, analysis.precioModelo, btcPrice]);

  const timeframeLabels: Record<Timeframe, string> = {
    '15d': '15 días',
    '30d': '30 días',
    '3m': '3 meses',
    '1y': '1 año',
    'all': 'Todo'
  };

  // Custom dot renderer for "HOY" marker
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.isToday && cx && cy) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="#06b6d4"
          stroke="#fff"
          strokeWidth={3}
        />
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in">
      {/* Timeframe Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['15d', '30d', '3m', '1y', 'all'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base ${
              timeframe === tf
                ? 'bg-bitcoin text-white shadow-lg shadow-bitcoin/30'
                : 'bg-card text-muted-foreground hover:bg-muted hover:scale-105'
            }`}
          >
            {timeframeLabels[tf]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px] sm:h-[400px] lg:h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          
          <YAxis 
            scale="log"
            domain={['auto', 'auto']}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
              return `$${value}`;
            }}
            style={{ fontSize: '12px' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
            formatter={(value: any, name: string) => {
              if (value === null) return ['-', name];
              return [`$${value?.toLocaleString()}`, name];
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]?.payload?.isToday) {
                return `${label} (📍 HOY)`;
              }
              return label;
            }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          
          {/* Ceiling Line (Green) */}
          <Line
            type="monotone"
            dataKey="techo"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Techo (3.0x)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          
          {/* Model Line (Blue) */}
          <Line
            type="monotone"
            dataKey="modelo"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            name="Modelo"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          
          {/* Real Price Line (Orange) */}
          <Line
            type="monotone"
            dataKey="precioReal"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={renderDot}
            connectNulls={false}
            name="Precio Real"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          
          {/* Floor Line (Red) */}
          <Line
            type="monotone"
            dataKey="piso"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Piso (0.5x)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          
          {/* Today vertical reference line (only for 'all' view) */}
          {timeframe === 'all' && (
            <ReferenceLine
              x={currentYear.toString()}
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: '← HOY',
                position: 'insideTopRight',
                fill: '#06b6d4',
                fontSize: 14,
                fontWeight: 'bold'
              }}
            />
          )}
        </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Informative Note for short-term views */}
      {(timeframe === '15d' || timeframe === '30d') && (
        <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/30">
          <p className="text-sm text-info">
            <strong>Vista de corto plazo:</strong> Analiza el precio modelo día a día 
            para identificar oportunidades de compra cuando el precio real esté por debajo del modelo.
          </p>
          <p className="text-xs text-info/80 mt-2">
            ⚠️ Los datos históricos son aproximados para demo. En producción se conectará a API real.
          </p>
        </div>
      )}
    </div>
  );
}
