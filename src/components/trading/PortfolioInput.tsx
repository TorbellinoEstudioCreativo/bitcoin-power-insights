import { Wallet } from "lucide-react";

interface PortfolioInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function PortfolioInput({ value, onChange }: PortfolioInputProps) {
  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-md">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Wallet className="w-4 h-4 text-primary" />
          Portfolio Total
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={100}
            max={10000000}
            className="w-full pl-8 pr-4 py-2 bg-secondary border border-border rounded-lg 
                       text-foreground focus:border-primary focus:ring-1 focus:ring-primary
                       transition-colors duration-200"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Rango: $100 - $10,000,000
        </p>
      </div>
    </div>
  );
}
