import { ChartLine, Clock } from "lucide-react";

interface TradingTabsProps {
  activeTab: 'powerlaw' | 'intraday';
  onTabChange: (tab: 'powerlaw' | 'intraday') => void;
}

export function TradingTabs({ activeTab, onTabChange }: TradingTabsProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-b border-border">
      <button
        onClick={() => onTabChange('powerlaw')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === 'powerlaw'
            ? 'bg-info text-info-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }`}
      >
        <ChartLine className="w-4 h-4" />
        <span>Power Law 1D</span>
      </button>
      
      <button
        onClick={() => onTabChange('intraday')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === 'intraday'
            ? 'bg-bitcoin text-bitcoin-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>Intradía</span>
      </button>
    </div>
  );
}
