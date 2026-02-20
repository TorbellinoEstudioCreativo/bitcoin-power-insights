// ============================================================================
// useTradeMonitor — State machine for signal persistence + trade monitoring
// Phases: idle → signal_available → monitoring → idle
// ============================================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { ScalpingSignal, ScalpingGate } from '@/lib/scalpingEngine';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export type TradePhase = 'idle' | 'signal_available' | 'monitoring';

export type HealthLevel = 'strong' | 'caution' | 'weak' | 'sl_hit';

export interface GateFlip {
  name: string;
  wasPass: boolean;
  isPass: boolean;
  status: 'PERDIDO' | 'RECUPERADO' | 'STABLE';
}

export interface TradeHealth {
  level: HealthLevel;
  label: string;
  criticalAlive: number;
  criticalTotal: number;
  gateFlips: GateFlip[];
  pnl: number;
  pnlPercent: number;
  currentPrice: number;
  slHit: boolean;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  slProgress: number;
  tp1Progress: number;
  tp2Progress: number;
  tp3Progress: number;
}

export interface TradeMonitorState {
  phase: TradePhase;
  displaySignal: ScalpingSignal | null;
  isStale: boolean;
  canTakeSignal: boolean;
  entryTime: number | null;
  elapsedMs: number;
  health: TradeHealth | null;
  lockSignal: () => void;
  closeTrade: () => void;
}

const SIGNAL_PERSIST_MS = 90_000; // 90 seconds

// ============================================================================
// HOOK
// ============================================================================

export function useTradeMonitor(
  liveSignal: ScalpingSignal | null,
  livePrice: number | undefined,
): TradeMonitorState {
  // Core state
  const [phase, setPhase] = useState<TradePhase>('idle');
  const [lockedSignal, setLockedSignal] = useState<ScalpingSignal | null>(null);
  const [lockedGates, setLockedGates] = useState<ScalpingGate[]>([]);
  const [entryTime, setEntryTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Signal persistence
  const [lastValidSignal, setLastValidSignal] = useState<ScalpingSignal | null>(null);
  const [isStale, setIsStale] = useState(false);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHealthLevelRef = useRef<HealthLevel | null>(null);

  // ── Signal persistence logic ──────────────────────────────────────────
  useEffect(() => {
    // In monitoring phase, don't touch signal persistence
    if (phase === 'monitoring') return;

    const hasActiveSignal = liveSignal?.criticalPass && liveSignal?.direction;

    if (hasActiveSignal) {
      // Fresh signal — snapshot it
      setLastValidSignal(liveSignal);
      setIsStale(false);
      setPhase('signal_available');

      // Clear any pending stale timer
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
        staleTimerRef.current = null;
      }
    } else if (lastValidSignal && !isStale) {
      // Signal disappeared — mark stale, keep snapshot for 90s
      setIsStale(true);

      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => {
        setLastValidSignal(null);
        setIsStale(false);
        setPhase('idle');
        staleTimerRef.current = null;
      }, SIGNAL_PERSIST_MS);
    } else if (!lastValidSignal) {
      setPhase('idle');
    }
  }, [liveSignal, phase, lastValidSignal, isStale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, []);

  // ── Timer for elapsed time during monitoring ──────────────────────────
  useEffect(() => {
    if (phase !== 'monitoring' || !entryTime) {
      setElapsedMs(0);
      return;
    }

    const tick = () => setElapsedMs(Date.now() - entryTime);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, entryTime]);

  // ── Actions ───────────────────────────────────────────────────────────
  const lockSignal = useCallback(() => {
    const signalToLock = lastValidSignal;
    if (!signalToLock) return;

    setLockedSignal(signalToLock);
    setLockedGates([...signalToLock.gates]);
    setEntryTime(Date.now());
    setPhase('monitoring');
    prevHealthLevelRef.current = null;

    // Clear stale timer since we're now monitoring
    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
      staleTimerRef.current = null;
    }

    toast.success('Trade activado', {
      description: `${signalToLock.direction} ${signalToLock.asset} @ $${signalToLock.entry.toLocaleString()}`,
    });
  }, [lastValidSignal]);

  const closeTrade = useCallback(() => {
    setPhase('idle');
    setLockedSignal(null);
    setLockedGates([]);
    setEntryTime(null);
    setElapsedMs(0);
    setLastValidSignal(null);
    setIsStale(false);
    prevHealthLevelRef.current = null;

    toast.info('Trade cerrado');
  }, []);

  // ── Health computation ────────────────────────────────────────────────
  const health = useMemo<TradeHealth | null>(() => {
    if (phase !== 'monitoring' || !lockedSignal || !liveSignal) return null;

    const currentPrice = livePrice ?? liveSignal.entry;
    const dir = lockedSignal.direction!;

    // P&L
    const pnl = dir === 'LONG'
      ? currentPrice - lockedSignal.entry
      : lockedSignal.entry - currentPrice;
    const pnlPercent = (pnl / lockedSignal.entry) * 100;

    // SL/TP hit detection
    const slHit = dir === 'LONG'
      ? currentPrice <= lockedSignal.sl
      : currentPrice >= lockedSignal.sl;
    const tp1Hit = dir === 'LONG'
      ? currentPrice >= lockedSignal.tp1
      : currentPrice <= lockedSignal.tp1;
    const tp2Hit = dir === 'LONG'
      ? currentPrice >= lockedSignal.tp2
      : currentPrice <= lockedSignal.tp2;
    const tp3Hit = dir === 'LONG'
      ? currentPrice >= lockedSignal.tp3
      : currentPrice <= lockedSignal.tp3;

    // Progress bars (0-100%)
    const entryToSl = Math.abs(lockedSignal.entry - lockedSignal.sl);
    const entryToTp1 = Math.abs(lockedSignal.tp1 - lockedSignal.entry);
    const entryToTp2 = Math.abs(lockedSignal.tp2 - lockedSignal.entry);
    const entryToTp3 = Math.abs(lockedSignal.tp3 - lockedSignal.entry);

    const priceMove = dir === 'LONG'
      ? currentPrice - lockedSignal.entry
      : lockedSignal.entry - currentPrice;

    const slProgress = priceMove < 0
      ? Math.min(100, (Math.abs(priceMove) / entryToSl) * 100)
      : 0;
    const tp1Progress = priceMove > 0
      ? Math.min(100, (priceMove / entryToTp1) * 100)
      : 0;
    const tp2Progress = priceMove > 0
      ? Math.min(100, (priceMove / entryToTp2) * 100)
      : 0;
    const tp3Progress = priceMove > 0
      ? Math.min(100, (priceMove / entryToTp3) * 100)
      : 0;

    // Gate flips: compare locked gates vs live gates
    const gateFlips: GateFlip[] = lockedGates.map((locked, i) => {
      const live = liveSignal.gates[i];
      if (!live) {
        return { name: locked.name, wasPass: locked.pass, isPass: false, status: 'STABLE' as const };
      }
      let status: GateFlip['status'] = 'STABLE';
      if (locked.pass && !live.pass) status = 'PERDIDO';
      else if (!locked.pass && live.pass) status = 'RECUPERADO';
      return { name: locked.name, wasPass: locked.pass, isPass: live.pass, status };
    });

    // Critical gates alive (from live signal)
    const criticalAlive = liveSignal.gates
      .filter(g => g.critical && g.pass).length;
    const criticalTotal = liveSignal.gates.filter(g => g.critical).length;

    // Health level
    let level: HealthLevel;
    let label: string;

    if (slHit) {
      level = 'sl_hit';
      label = 'CERRAR — Stop Loss alcanzado';
    } else if (criticalAlive <= 2) {
      level = 'weak';
      label = 'CONSIDERAR CERRAR — Señal deteriorada';
    } else if (criticalAlive === 3) {
      level = 'caution';
      label = 'PRECAUCIÓN — Monitorea de cerca';
    } else {
      level = 'strong';
      label = 'MANTENER — Señal fuerte';
    }

    return {
      level,
      label,
      criticalAlive,
      criticalTotal,
      gateFlips,
      pnl,
      pnlPercent,
      currentPrice,
      slHit,
      tp1Hit,
      tp2Hit,
      tp3Hit,
      slProgress,
      tp1Progress,
      tp2Progress,
      tp3Progress,
    };
  }, [phase, lockedSignal, lockedGates, liveSignal, livePrice]);

  // ── Toast notifications on health level change ────────────────────────
  useEffect(() => {
    if (!health) return;

    const prev = prevHealthLevelRef.current;
    if (prev && prev !== health.level) {
      switch (health.level) {
        case 'sl_hit':
          toast.error('Stop Loss alcanzado', { description: 'Considera cerrar el trade inmediatamente.' });
          break;
        case 'weak':
          toast.warning('Señal deteriorada', { description: 'Solo 2 o menos gates críticos activos.' });
          break;
        case 'caution':
          toast.warning('Precaución', { description: 'Un gate crítico se perdió. Monitorea de cerca.' });
          break;
        case 'strong':
          toast.success('Señal recuperada', { description: 'Todos los gates críticos activos.' });
          break;
      }
    }
    prevHealthLevelRef.current = health.level;
  }, [health]);

  // ── Display signal: locked during monitoring, persisted otherwise ─────
  const displaySignal = phase === 'monitoring'
    ? lockedSignal
    : lastValidSignal;

  const canTakeSignal = phase === 'signal_available' && !!lastValidSignal;

  return {
    phase,
    displaySignal,
    isStale,
    canTakeSignal,
    entryTime,
    elapsedMs,
    health,
    lockSignal,
    closeTrade,
  };
}
