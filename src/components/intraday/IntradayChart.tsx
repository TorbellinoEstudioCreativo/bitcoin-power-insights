import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend
} from 'recharts';
import { IntradayCandle, IntradayTimeframe, IntradayEMAs } from '@/hooks/useIntradayData';
import { cn } from '@/lib/utils';

interface IntradayChartProps {
  candles: IntradayCandle[];
  emas: IntradayEMAs;
  timeframe: IntradayTimeframe;
  onTimeframeChange: (tf: IntradayTimeframe) => void;
  isLoading?: boolean;
}

const TIMEFRAMES: IntradayTimeframe[] = ['5m', '15m', '30m', '1h', '4h'];

export function IntradayChart({
  candles,
  emas,
  timeframe,
  onTimeframeChange,
  isLoading
}: IntradayChartProps) {
  // Transform data for chart
  const chartData = candles.map((candle, index) => ({
    time: candle.timestamp,
    price: candle.close,
    ema9: !isNaN(emas.ema9Values[index]) ? emas.ema9Values[index] : null,
    ema21: !isNaN(emas.ema21Values[index]) ? emas.ema21Values[index] : null,
    ema50: !isNaN(emas.ema50Values[index]) ? emas.ema50Values[index] : null
  }));

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeframe === '4h' || timeframe === '1h') {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + 
             ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (value: number) => {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  // Calculate Y-axis domain with padding
  const prices = chartData.map(d => d.price).filter(Boolean);
  const minPrice = Math.min(...prices) * 0.998;
  const maxPrice = Math.max(...prices) * 1.002;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Gráfico Intradía</h3>
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              minTickGap={50}
            />
            
            <YAxis
              domain={[minPrice, maxPrice]}
              tickFormatter={formatPrice}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              width={70}
            />
            
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatTime(data.time)}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatPrice(data.price)}
                    </p>
                    {data.ema9 && (
                      <p className="text-xs text-success">EMA9: {formatPrice(data.ema9)}</p>
                    )}
                    {data.ema21 && (
                      <p className="text-xs text-info">EMA21: {formatPrice(data.ema21)}</p>
                    )}
                    {data.ema50 && (
                      <p className="text-xs text-purple-400">EMA50: {formatPrice(data.ema50)}</p>
                    )}
                  </div>
                );
              }}
            />

            {/* Price Area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />

            {/* EMA Lines */}
            <Line
              type="monotone"
              dataKey="ema9"
              stroke="hsl(var(--success))"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ema21"
              stroke="hsl(var(--info))"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ema50"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary rounded" />
          <span className="text-muted-foreground">Precio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-success rounded" />
          <span className="text-muted-foreground">EMA9</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-info rounded" />
          <span className="text-muted-foreground">EMA21</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-purple-400 rounded" />
          <span className="text-muted-foreground">EMA50</span>
        </div>
      </div>
    </div>
  );
}
