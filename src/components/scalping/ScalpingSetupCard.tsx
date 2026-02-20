import { TrendingUp, TrendingDown, Target, ShieldAlert, Timer, AlertTriangle, Crosshair } from 'lucide-react';
import type { ScalpingSignal } from '@/lib/scalpingEngine';
import { cn } from '@/lib/utils';

interface ScalpingSetupCardProps {
  signal: ScalpingSignal;
  isStale?: boolean;
  onTakeSignal?: () => void;
  canTakeSignal?: boolean;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(4);
}

export function ScalpingSetupCard({ signal, isStale, onTakeSignal, canTakeSignal }: ScalpingSetupCardProps) {
  if (!signal.criticalPass || !signal.direction) {
    return (
      <div className="border border-border rounded-xl p-6 bg-card">
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-muted-foreground/50">ESPERANDO SEÑAL</div>
          <p className="text-sm text-muted-foreground">
            Críticos: {signal.criticalPassed}/{signal.criticalTotal} — Confirmatorios: {signal.confirmatoryPassed}/{signal.confirmatoryTotal}
          </p>
        </div>
      </div>
    );
  }

  const isLong = signal.direction === 'LONG';
  const borderColor = isLong ? 'border-green-500' : 'border-red-500';
  const bgGlow = isLong ? 'bg-green-500/5' : 'bg-red-500/5';
  const dirColor = isLong ? 'text-green-400' : 'text-red-400';
  const dirBg = isLong ? 'bg-green-500/20' : 'bg-red-500/20';
  const DirIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <div className={`border-2 ${borderColor} rounded-xl p-5 ${bgGlow} space-y-4 transition-all`}>
      {/* Stale Banner */}
      {isStale && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-400 font-medium">
            Señal capturada — los datos han cambiado
          </span>
        </div>
      )}

      {/* Header: Direction + Asset + TF */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm ${dirBg} ${dirColor}`}>
            <DirIcon className="w-4 h-4" />
            {signal.direction}
          </span>
          <span className="text-lg font-bold text-foreground">{signal.asset}</span>
          <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Confianza</div>
          <div className={`text-lg font-bold ${dirColor}`}>{signal.confidence}%</div>
        </div>
      </div>

      {/* Entry Price */}
      <div className="bg-secondary/30 rounded-lg p-3">
        <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
        <div className="text-2xl font-bold text-foreground">${formatPrice(signal.entry)}</div>
      </div>

      {/* SL + TPs Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Stop Loss */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400 font-medium">Stop Loss</span>
          </div>
          <div className="text-sm font-bold text-foreground">${formatPrice(signal.sl)}</div>
          <div className="text-xs text-red-400">-{signal.slPercent.toFixed(2)}%</div>
        </div>

        {/* R:R */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">R:R Ratio</div>
          <div className="text-sm font-bold text-foreground">1:{signal.riskReward.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Basado en TP2</div>
        </div>
      </div>

      {/* Take Profits */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-medium">Take Profits (Exit Strategy)</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-medium">TP1 — 40%</span>
            </div>
            <div className="text-xs font-bold text-foreground">${formatPrice(signal.tp1)}</div>
            <div className="text-[10px] text-green-400">+{signal.tp1Percent.toFixed(2)}%</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-medium">TP2 — 30%</span>
            </div>
            <div className="text-xs font-bold text-foreground">${formatPrice(signal.tp2)}</div>
            <div className="text-[10px] text-green-400">+{signal.tp2Percent.toFixed(2)}%</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-medium">TP3 — 30%</span>
            </div>
            <div className="text-xs font-bold text-foreground">${formatPrice(signal.tp3)}</div>
            <div className="text-[10px] text-green-400">+{signal.tp3Percent.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {/* Leverage + Time Limit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Leverage Sugerido</div>
          <div className="text-sm font-bold text-foreground">{signal.leverage.suggested}x</div>
          <div className="text-xs text-muted-foreground">Max: {signal.leverage.max}x</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Time Limit</span>
          </div>
          <div className="text-sm font-bold text-foreground">{signal.timeLimit}</div>
          <div className="text-xs text-muted-foreground">Cerrar si no ejecuta</div>
        </div>
      </div>

      {/* Take Signal Button */}
      {canTakeSignal && onTakeSignal && (
        <button
          onClick={onTakeSignal}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all',
            isLong
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          )}
        >
          <Crosshair className="w-4 h-4" />
          Tomar Señal — {signal.direction} {signal.asset}
        </button>
      )}
    </div>
  );
}
