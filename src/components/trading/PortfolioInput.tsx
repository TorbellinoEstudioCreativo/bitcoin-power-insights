import { Wallet, Percent } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PortfolioInputProps {
  value: number;
  onChange: (value: number) => void;
  interestRate: number;
  onInterestRateChange: (value: number) => void;
  estimatedCost6m?: number;
}

export function PortfolioInput({ 
  value, 
  onChange, 
  interestRate, 
  onInterestRateChange,
  estimatedCost6m = 0 
}: PortfolioInputProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex flex-wrap gap-6">
        {/* Portfolio Value */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            {t('portfolio', 'total')}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={value === 0 ? '' : value.toLocaleString('en-US')}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/,/g, '');
                if (rawValue === '') {
                  onChange(0);
                  return;
                }
                const numValue = parseFloat(rawValue);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 10000000) {
                  onChange(numValue);
                }
              }}
              placeholder="10,000"
              className="w-full pl-8 pr-4 py-2 bg-secondary border border-border rounded-lg 
                         text-foreground focus:border-primary focus:ring-1 focus:ring-primary
                         transition-colors duration-200"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('portfolio', 'range')}
          </p>
        </div>

        {/* Interest Rate */}
        <div className="min-w-[160px] max-w-[200px]">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Percent className="w-4 h-4 text-primary" />
            {t('portfolio', 'interestRate')}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={interestRate === 0 ? '' : interestRate.toString()}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (rawValue === '') {
                  onInterestRateChange(0);
                  return;
                }
                const numValue = parseFloat(rawValue);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
                  onInterestRateChange(numValue);
                }
              }}
              placeholder="5"
              className="w-full pl-4 pr-8 py-2 bg-secondary border border-border rounded-lg 
                         text-foreground focus:border-primary focus:ring-1 focus:ring-primary
                         transition-colors duration-200"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('portfolio', 'interestHelp')}
          </p>
        </div>

        {/* Estimated Cost Preview */}
        {estimatedCost6m > 0 && (
          <div className="flex items-center">
            <div className="bg-muted/50 rounded-lg px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {t('portfolio', 'estimatedCost6m')}
              </p>
              <p className="text-lg font-bold text-danger">
                ${estimatedCost6m.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
