import { useState } from 'react';
import { Zap, Clock } from 'lucide-react';
import { useScalpingSignal } from '@/hooks/useScalpingSignal';
import { useAssetTicker } from '@/hooks/useAssetTicker';
import { useTradeMonitor } from '@/hooks/useTradeMonitor';
import { ScalpingSetupCard } from '@/components/scalping/ScalpingSetupCard';
import { ScalpingGatesPanel } from '@/components/scalping/ScalpingGatesPanel';
import { ScalpingTradeMonitor } from '@/components/scalping/ScalpingTradeMonitor';
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
  const { data: tickerData } = useAssetTicker(selectedAsset, enabled);

  const {
    phase,
    displaySignal,
    isStale,
    canTakeSignal,
    elapsedMs,
    health,
    lockSignal,
    closeTrade,
  } = useTradeMonitor(signal, tickerData?.price);

  const isMonitoring = phase === 'monitoring';

  // Use the persisted/display signal for the setup card, fall back to live signal
  const cardSignal = displaySignal ?? signal;
  const hasSignal = cardSignal?.criticalPass && cardSignal?.direction;

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
          {isMonitoring && (
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-medium animate-pulse">
              TRADE ACTIVO
            </span>
          )}
        </div>
      </div>

      {/* Selectors: Asset + Timeframe — disabled during monitoring */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3",
        isMonitoring && "pointer-events-none opacity-50"
      )}>
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
      {isMonitoring && displaySignal && health ? (
        /* ── Monitoring Mode ─────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ScalpingTradeMonitor
              signal={displaySignal}
              health={health}
              elapsedMs={elapsedMs}
              onCloseTrade={closeTrade}
              liveSignalGates={signal?.gates}
            />
          </div>
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
      ) : (
        /* ── Normal Mode (idle / signal_available) ───────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Setup Card */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="border border-border rounded-xl p-8 bg-card flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground animate-pulse">Cargando datos...</div>
                </div>
              </div>
            ) : cardSignal ? (
              <ScalpingSetupCard
                signal={cardSignal}
                isStale={isStale}
                canTakeSignal={canTakeSignal}
                onTakeSignal={lockSignal}
              />
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
      )}
    </div>
  );
}
