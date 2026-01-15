import React from 'react';
import { Bitcoin, TrendingUp, Zap } from 'lucide-react';
import { IntradayAsset } from '@/hooks/useIntradayData';
import { cn } from '@/lib/utils';

interface AssetSelectorProps {
  selectedAsset: IntradayAsset;
  onAssetChange: (asset: IntradayAsset) => void;
}

const ASSETS: { id: IntradayAsset; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'BTC', label: 'Bitcoin', icon: Bitcoin, color: 'text-bitcoin' },
  { id: 'ETH', label: 'Ethereum', icon: TrendingUp, color: 'text-info' },
  { id: 'BNB', label: 'BNB', icon: Zap, color: 'text-warning' }
];

export function AssetSelector({ selectedAsset, onAssetChange }: AssetSelectorProps) {
  return (
    <div className="flex gap-2">
      {ASSETS.map(({ id, label, icon: Icon, color }) => (
        <button
          key={id}
          onClick={() => onAssetChange(id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            "border font-medium",
            selectedAsset === id
              ? "bg-secondary border-primary text-foreground shadow-md"
              : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Icon className={cn("h-4 w-4", selectedAsset === id && color)} />
          <span>{id}</span>
        </button>
      ))}
    </div>
  );
}
