import { useState } from 'react';
import { Zap, Clock } from 'lucide-react';
import { useScalpingSignal } from '@/hooks/useScalpingSignal';
import { ScalpingSetupCard } from '@/components/scalping/ScalpingSetupCard';
import { ScalpingGatesPanel } from '@/components/scalping/ScalpingGatesPanel';
import { AssetSelector } from '@/components/intraday/AssetSelector';
import type { IntradayAsset } from '@/hooks/useIntradayData';
import { cn } from '@/lib/utils';

interface ScalpingViewProps {
  enabled?: boolean;
}

const TIMEFRAMES = ['1m', '5m'] as const;
type ScalpingTF = (typeof TIMEFRAMES)[number];

export function ScalpingView({ enabled = true }: ScalpingViewProps) {
  const [selectedAsset, setSelectedAsset] = useState<IntradayAsset>('BTC');
  const [selectedTF, setSelectedTF] = useState<ScalpingTF>('1m');

  const { signal, isLoading } = useScalpingSignal(selectedAsset, selectedTF, enabled);

  const hasSignal = signal?.criticalPass && signal?.direction;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-bold text-foreground">Scalping</h1>
          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">
            Gate-Based
          </span>
        </div>
      </div>

      {/* Selectors: Asset + Timeframe */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <AssetSelector selectedAsset={selectedAsset} onAssetChange={setSelectedAsset} />
        <div className="flex gap-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTF(tf)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all duration-200",
                "border font-medium text-sm",
                selectedTF === tf
                  ? "bg-secondary border-primary text-foreground shadow-md"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Setup Card */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="border border-border rounded-xl p-8 bg-card flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground animate-pulse">Cargando datos...</div>
              </div>
            </div>
          ) : signal ? (
            <ScalpingSetupCard signal={signal} />
          ) : (
            <div className="border border-border rounded-xl p-8 bg-card">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-muted-foreground/50">CARGANDO...</div>
                <p className="text-sm text-muted-foreground">
                  Esperando datos de {selectedAsset} {selectedTF}
                </p>
              </div>
            </div>
          )}

          {/* Status message when no signal */}
          {!isLoading && !hasSignal && (
            <div className="mt-3 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground text-center">
              Se requiere que los <strong>4 gates críticos</strong> pasen para generar señal.
              Los gates confirmatorios mejoran la confianza pero no bloquean la entrada.
            </div>
          )}
        </div>

        {/* Right: Gates Panel */}
        <div>
          {signal ? (
            <ScalpingGatesPanel signal={signal} />
          ) : (
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-sm text-muted-foreground text-center">
                Cargando gates...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
