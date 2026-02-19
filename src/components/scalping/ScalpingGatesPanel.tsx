import { CheckCircle2, XCircle, Shield, Star } from 'lucide-react';
import type { ScalpingSignal, ScalpingGate } from '@/lib/scalpingEngine';

interface ScalpingGatesPanelProps {
  signal: ScalpingSignal;
}

function GateItem({ gate }: { gate: ScalpingGate }) {
  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
        gate.pass
          ? gate.critical ? 'bg-green-500/5' : 'bg-blue-500/5'
          : gate.critical ? 'bg-red-500/5' : 'bg-secondary/30'
      }`}
    >
      {gate.pass ? (
        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${gate.critical ? 'text-green-400' : 'text-blue-400'}`} />
      ) : (
        <XCircle className={`w-4 h-4 mt-0.5 shrink-0 ${gate.critical ? 'text-red-400' : 'text-muted-foreground'}`} />
      )}
      <div className="min-w-0">
        <div className={`text-xs font-medium ${
          gate.pass
            ? gate.critical ? 'text-green-400' : 'text-blue-400'
            : gate.critical ? 'text-red-400' : 'text-muted-foreground'
        }`}>
          {gate.name}
        </div>
        <div className="text-[11px] text-muted-foreground leading-tight">{gate.reason}</div>
      </div>
    </div>
  );
}

export function ScalpingGatesPanel({ signal }: ScalpingGatesPanelProps) {
  const criticalGates = signal.gates.filter(g => g.critical);
  const confirmatoryGates = signal.gates.filter(g => !g.critical);

  const criticalPercent = signal.criticalTotal > 0 ? (signal.criticalPassed / signal.criticalTotal) * 100 : 0;
  const confirmatoryPercent = signal.confirmatoryTotal > 0 ? (signal.confirmatoryPassed / signal.confirmatoryTotal) * 100 : 0;

  const criticalBarColor = signal.criticalPass ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      {/* Critical Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-foreground">Críticos</h3>
          </div>
          <span className={`text-sm font-bold ${signal.criticalPass ? 'text-green-400' : 'text-red-400'}`}>
            {signal.criticalPassed}/{signal.criticalTotal}
          </span>
        </div>

        {/* Critical Progress Bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${criticalBarColor} rounded-full transition-all duration-500`}
            style={{ width: `${criticalPercent}%` }}
          />
        </div>

        {/* Critical Gates List */}
        <div className="space-y-1.5">
          {criticalGates.map((gate, index) => (
            <GateItem key={index} gate={gate} />
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Confirmatory Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground">Confirmatorios</h3>
          </div>
          <span className="text-sm font-bold text-blue-400">
            {signal.confirmatoryPassed}/{signal.confirmatoryTotal}
          </span>
        </div>

        {/* Confirmatory Progress Bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${confirmatoryPercent}%` }}
          />
        </div>

        {/* Confirmatory Gates List */}
        <div className="space-y-1.5">
          {confirmatoryGates.map((gate, index) => (
            <GateItem key={index} gate={gate} />
          ))}
        </div>
      </div>
    </div>
  );
}
