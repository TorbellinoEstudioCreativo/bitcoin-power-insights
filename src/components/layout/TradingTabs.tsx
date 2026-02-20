import { ChartLine, Clock, Zap } from "lucide-react";

export type TradingTabId = 'powerlaw' | 'intraday' | 'scalping';

interface TradingTabsProps {
  activeTab: TradingTabId;
  onTabChange: (tab: TradingTabId) => void;
}

export function TradingTabs({ activeTab, onTabChange }: TradingTabsProps) {
  return (
    <div className="flex items-center px-4 py-2 bg-card/50 border-b border-border">
      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
        <button
          onClick={() => onTabChange('powerlaw')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'powerlaw'
              ? 'bg-info text-info-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChartLine className="w-4 h-4" />
          <span>Power Law 1D</span>
        </button>

        <button
          onClick={() => onTabChange('intraday')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'intraday'
              ? 'bg-bitcoin text-bitcoin-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Intraday</span>
        </button>

        <button
          onClick={() => onTabChange('scalping')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'scalping'
              ? 'bg-yellow-500/90 text-yellow-950 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Scalping</span>
        </button>
      </div>
    </div>
  );
}
