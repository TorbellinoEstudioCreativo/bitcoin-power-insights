// ============================================================================
// ScalpingTradeMonitor — Dashboard de monitoreo durante un trade activo
// ============================================================================

import {
  TrendingUp,
  TrendingDown,
  Timer,
  X,
  Activity,
  Crosshair,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Target,
} from 'lucide-react';
import type { ScalpingSignal } from '@/lib/scalpingEngine';
import type { TradeHealth, GateFlip } from '@/hooks/useTradeMonitor';
import { cn } from '@/lib/utils';

// ============================================================================
// PROPS
// ============================================================================

interface ScalpingTradeMonitorProps {
  signal: ScalpingSignal;
  health: TradeHealth;
  elapsedMs: number;
  onCloseTrade: () => void;
  liveSignalGates?: ScalpingSignal['gates'];
}

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(4);
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const HEALTH_STYLES = {
  strong: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', pulse: false },
  caution: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', pulse: false },
  weak: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', pulse: false },
  sl_hit: { bg: 'bg-red-500/15', border: 'border-red-500/50', text: 'text-red-400', pulse: true },
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProgressBar({
  label,
  progress,
  hit,
  color,
}: {
  label: string;
  progress: number;
  hit: boolean;
  color: 'green' | 'red';
}) {
  const barColor = color === 'green' ? 'bg-green-500' : 'bg-red-500';
  const textColor = color === 'green' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-medium', textColor)}>{progress.toFixed(1)}%</span>
          {hit && (
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded',
              color === 'green' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            )}>
              HIT
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

function GateHealthItem({ flip, liveGate }: { flip: GateFlip; liveGate?: { pass: boolean; reason: string; critical: boolean } }) {
  const isAlive = flip.isPass;
  const isCritical = liveGate?.critical ?? true;

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-lg',
      isAlive
        ? isCritical ? 'bg-green-500/5' : 'bg-blue-500/5'
        : isCritical ? 'bg-red-500/5' : 'bg-secondary/30'
    )}>
      <div className="flex items-center gap-2">
        {isAlive ? (
          <CheckCircle2 className={cn('w-4 h-4 shrink-0', isCritical ? 'text-green-400' : 'text-blue-400')} />
        ) : (
          <XCircle className={cn('w-4 h-4 shrink-0', isCritical ? 'text-red-400' : 'text-muted-foreground')} />
        )}
        <div>
          <span className={cn(
            'text-xs font-medium',
            isAlive
              ? isCritical ? 'text-green-400' : 'text-blue-400'
              : isCritical ? 'text-red-400' : 'text-muted-foreground'
          )}>
            {flip.name}
          </span>
          {liveGate && (
            <div className="text-[10px] text-muted-foreground leading-tight">{liveGate.reason}</div>
          )}
        </div>
      </div>
      {flip.status !== 'STABLE' && (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
          flip.status === 'PERDIDO'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-green-500/20 text-green-400'
        )}>
          {flip.status}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScalpingTradeMonitor({
  signal,
  health,
  elapsedMs,
  onCloseTrade,
  liveSignalGates,
}: ScalpingTradeMonitorProps) {
  const isLong = signal.direction === 'LONG';
  const dirColor = isLong ? 'text-green-400' : 'text-red-400';
  const dirBg = isLong ? 'bg-green-500/20' : 'bg-red-500/20';
  const DirIcon = isLong ? TrendingUp : TrendingDown;
  const borderColor = isLong ? 'border-green-500' : 'border-red-500';

  const style = HEALTH_STYLES[health.level];
  const pnlColor = health.pnl >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className={cn('border-2 rounded-xl p-5 space-y-4 transition-all', borderColor, isLong ? 'bg-green-500/5' : 'bg-red-500/5')}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm', dirBg, dirColor)}>
            <DirIcon className="w-4 h-4" />
            {signal.direction}
          </span>
          <span className="text-lg font-bold text-foreground">{signal.asset}</span>
          <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono">{formatElapsed(elapsedMs)}</span>
          </div>
        </div>
        <button
          onClick={onCloseTrade}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-destructive/20 hover:text-red-400 text-muted-foreground text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Cerrar Trade
        </button>
      </div>

      {/* ── Health Banner ──────────────────────────────────────────────── */}
      <div className={cn(
        'border rounded-lg p-3 flex items-center gap-2',
        style.bg, style.border,
        style.pulse && 'animate-pulse'
      )}>
        <Activity className={cn('w-5 h-5 shrink-0', style.text)} />
        <div>
          <div className={cn('text-sm font-bold', style.text)}>{health.label}</div>
          <div className="text-xs text-muted-foreground">
            Gates críticos: {health.criticalAlive}/{health.criticalTotal}
          </div>
        </div>
      </div>

      {/* ── P&L en vivo + Entry info ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">P&L</span>
          </div>
          <div className={cn('text-2xl font-bold', pnlColor)}>
            {health.pnl >= 0 ? '+' : ''}{formatPrice(health.pnl)}
          </div>
          <div className={cn('text-sm font-medium', pnlColor)}>
            {health.pnlPercent >= 0 ? '+' : ''}{health.pnlPercent.toFixed(3)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Actual: ${formatPrice(health.currentPrice)}
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
          <div>
            <div className="text-xs text-muted-foreground">Entry</div>
            <div className="text-sm font-bold text-foreground">${formatPrice(signal.entry)}</div>
          </div>
          <div className="flex gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground">Confianza</div>
              <div className={cn('text-xs font-bold', dirColor)}>{signal.confidence}%</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Leverage</div>
              <div className="text-xs font-bold text-foreground">{signal.leverage.suggested}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SL / TP Progress Bars ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          Progreso SL / TP
        </div>

        <ProgressBar
          label={`SL — $${formatPrice(signal.sl)}`}
          progress={health.slProgress}
          hit={health.slHit}
          color="red"
        />
        <ProgressBar
          label={`TP1 (40%) — $${formatPrice(signal.tp1)}`}
          progress={health.tp1Progress}
          hit={health.tp1Hit}
          color="green"
        />
        <ProgressBar
          label={`TP2 (30%) — $${formatPrice(signal.tp2)}`}
          progress={health.tp2Progress}
          hit={health.tp2Hit}
          color="green"
        />
        <ProgressBar
          label={`TP3 (30%) — $${formatPrice(signal.tp3)}`}
          progress={health.tp3Progress}
          hit={health.tp3Hit}
          color="green"
        />
      </div>

      {/* ── Gate Health ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Salud de Gates en Vivo
        </div>
        <div className="space-y-1.5">
          {health.gateFlips.map((flip, i) => (
            <GateHealthItem
              key={flip.name}
              flip={flip}
              liveGate={liveSignalGates?.[i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
