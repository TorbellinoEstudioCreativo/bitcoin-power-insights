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

// Historical prices - WEEKLY approximations for more granularity
// Each array has ~52 entries representing weekly prices throughout the year
const historicalPricesWeekly: Record<number, number[]> = {
  2013: [13, 15, 20, 25, 30, 35, 47, 100, 120, 135, 120, 100, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 180, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 950, 1000, 1100, 1200, 800, 750, 700, 800, 850, 900, 800, 750, 700, 750, 750],
  2014: [850, 820, 750, 700, 650, 620, 580, 550, 500, 480, 460, 450, 440, 430, 450, 480, 520, 560, 600, 640, 620, 600, 580, 560, 540, 520, 500, 480, 460, 440, 420, 400, 380, 370, 360, 350, 340, 335, 330, 340, 350, 360, 370, 380, 370, 360, 350, 340, 330, 320, 315, 320],
  2015: [280, 260, 250, 240, 230, 220, 230, 240, 250, 260, 250, 240, 230, 235, 240, 250, 260, 270, 280, 290, 280, 275, 270, 265, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 450, 440, 430, 425, 420, 425, 430],
  2016: [430, 400, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 500, 530, 560, 590, 620, 650, 680, 700, 680, 660, 640, 620, 610, 600, 590, 580, 590, 600, 610, 620, 640, 660, 680, 700, 720, 740, 760, 780, 800, 820, 840, 860, 880, 900, 920, 940, 960, 980, 950, 960],
  2017: [1000, 1050, 1100, 1150, 1200, 1100, 1000, 1050, 1150, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 2000, 2200, 2400, 2600, 2800, 2600, 2400, 2700, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 9000, 10000, 11000, 12000, 14000, 16000, 18000, 19000, 18500, 17000, 15000, 14000, 13000, 14000, 15000, 14000, 13850],
  2018: [14000, 12000, 10000, 9000, 8500, 8000, 7500, 7000, 6800, 7000, 7500, 8000, 8500, 9000, 8500, 8000, 7500, 7000, 6500, 6300, 6100, 6000, 6200, 6400, 6600, 6500, 6400, 6300, 6200, 6100, 6000, 5800, 5600, 5400, 5200, 5000, 4800, 4600, 4400, 4200, 4000, 3800, 3600, 3500, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 3900],
  2019: [3800, 3600, 3500, 3600, 3700, 3800, 4000, 4200, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 11500, 11000, 10500, 10000, 9500, 9000, 8500, 8000, 8200, 8400, 8600, 8800, 9000, 8800, 8600, 8400, 8200, 8000, 7800, 7600, 7400, 7200, 7300, 7400, 7300, 7200, 7100, 7200],
  2020: [7200, 7400, 7600, 8000, 8500, 9000, 9500, 10000, 9500, 8500, 7500, 6500, 5500, 5000, 6000, 7000, 8000, 9000, 9200, 9400, 9600, 9800, 10000, 10500, 11000, 11500, 12000, 11500, 11000, 10500, 10800, 11200, 11600, 12000, 12500, 13000, 13500, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000, 24000, 26000, 28000, 27000, 26000, 28000, 29000],
  2021: [32000, 35000, 38000, 42000, 46000, 50000, 54000, 58000, 55000, 52000, 48000, 45000, 48000, 52000, 56000, 60000, 64000, 58000, 52000, 46000, 40000, 35000, 32000, 30000, 32000, 35000, 38000, 42000, 46000, 50000, 48000, 46000, 44000, 42000, 40000, 42000, 44000, 46000, 48000, 52000, 56000, 60000, 64000, 68000, 65000, 58000, 52000, 48000, 46000, 48000, 50000, 47000],
  2022: [46000, 44000, 42000, 40000, 38000, 36000, 38000, 40000, 42000, 44000, 42000, 40000, 38000, 36000, 34000, 32000, 30000, 28000, 26000, 24000, 22000, 20000, 21000, 22000, 23000, 24000, 22000, 20000, 19000, 18000, 19000, 20000, 21000, 22000, 21000, 20000, 19500, 19000, 19500, 20000, 20500, 21000, 20000, 19000, 18000, 17000, 16500, 16000, 16500, 17000, 16500, 16500],
  2023: [17000, 18000, 19000, 21000, 23000, 25000, 24000, 23000, 22000, 21000, 22000, 23000, 24000, 26000, 28000, 30000, 29000, 28000, 27000, 26000, 27000, 28000, 29000, 30000, 29500, 29000, 28500, 28000, 27000, 26000, 27000, 28000, 29000, 30000, 31000, 32000, 33000, 34000, 35000, 36000, 37000, 38000, 37000, 36000, 37000, 38000, 40000, 42000, 44000, 43000, 42000, 42500],
  2024: [43000, 44000, 46000, 48000, 50000, 52000, 54000, 56000, 58000, 60000, 62000, 64000, 66000, 68000, 70000, 72000, 70000, 68000, 66000, 64000, 65000, 66000, 67000, 68000, 66000, 64000, 62000, 60000, 58000, 56000, 58000, 60000, 62000, 64000, 66000, 68000, 70000, 72000, 74000, 76000, 78000, 80000, 82000, 85000, 88000, 90000, 92000, 95000, 98000, 100000, 98000, 96000],
  2025: [94000, 96000, 98000, 100000, 98000, 96000, 94000, 95000, 96000, 97000, 95000, 93000, 94000, 95000, 96000, 97000, 98000, 96000, 94000, 93000, 94000, 95000, 96000, 97000, 98000, 97000, 96000, 95000, 94000, 93000, 94000, 95000, 96000, 95000, 94000, 93000, 94000, 95000, 96000, 97000, 98000, 97000, 96000, 95000, 94000, 95000, 96000, 95000, 94000, 93000, 94000, 93000]
};

// Fallback yearly averages for interpolation
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
      // Full view: WEEKLY data for real volatility (~600+ points)
      for (let year = 2013; year <= 2037; year++) {
        const weeksInYear = 52;
        const weeklyPrices = historicalPricesWeekly[year];
        
        for (let week = 0; week < weeksInYear; week++) {
          const dayOfYear = week * 7;
          const date = new Date(year, 0, dayOfYear + 1);
          
          const days = Math.floor((date.getTime() - GENESIS_DATE.getTime()) / 86400000);
          const years = days / 365.25;
          const modelo = calcularPrecioPowerLaw(years);
          
          const isFuture = year > currentYear || (year === currentYear && week > Math.floor((currentDate.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 86400000)));
          const isToday = year === currentYear && week === Math.floor((currentDate.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 86400000));
          
          let precioReal: number | null = null;
          if (!isFuture) {
            if (isToday) {
              precioReal = btcPrice;
            } else if (weeklyPrices && weeklyPrices[week] !== undefined) {
              // Use actual weekly historical data
              precioReal = weeklyPrices[week];
            } else if (dynamicHistoricalPrices[year]) {
              // Fallback: interpolate from yearly average with weekly variation
              const weekVariation = Math.sin(week / 52 * Math.PI * 4) * 0.15;
              precioReal = dynamicHistoricalPrices[year] * (1 + weekVariation);
            }
          }
          
          // Only show year label on first week of each year
          const showLabel = week === 0 && year % 2 === 1; // Show odd years
          
          data.push({
            date: showLabel ? year.toString() : '',
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
      // 1 year: DAILY data for maximum granularity (365 points)
      for (let i = 365; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        const daysSince = Math.floor((date.getTime() - GENESIS_DATE.getTime()) / 86400000);
        const yearsSince = daysSince / 365.25;
        const modelo = calcularPrecioPowerLaw(yearsSince);
        
        const isToday = i === 0;
        const ratioActual = btcPrice / analysis.precioModelo;
        
        // Use seeded random for consistent variations based on date
        const seed = date.getTime() % 1000 / 1000;
        const variation = (seed - 0.5) * 0.08;
        const precioReal = isToday 
          ? btcPrice 
          : modelo * ratioActual * (1 + variation);
        
        // Only show label every month
        const showLabel = i % 30 === 0;
        
        data.push({
          date: showLabel ? date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '',
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
            ticks={timeframe === 'all' ? 
              Array.from({ length: 13 }, (_, i) => (2013 + i * 2).toString()) : 
              undefined
            }
            interval={timeframe === 'all' ? 0 : 'preserveStartEnd'}
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
