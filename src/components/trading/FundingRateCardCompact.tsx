import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { InfoTooltip } from "./InfoTooltip";
import { 
  FundingRateData, 
  formatFundingRate, 
  getFundingLevelLabel, 
  getFundingLevelColor 
} from "@/lib/derivatives";

interface FundingRateCardCompactProps {
  data?: FundingRateData;
  isLoading?: boolean;
}

export function FundingRateCardCompact({ data, isLoading }: FundingRateCardCompactProps) {
  // Debug: Log cuando cambian los datos
  useEffect(() => {
    if (data) {
      logger.log('[FundingRateCard] Data received:', {
        rate: formatFundingRate(data.fundingRatePercent),
        level: data.level,
        nextFunding: new Date(data.nextFundingTime).toLocaleString()
      });
    }
  }, [data]);
  const [countdown, setCountdown] = useState('');

  // Update countdown every second
  useEffect(() => {
    if (!data?.nextFundingTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = data.nextFundingTime - now;
      
      if (diff <= 0) {
        setCountdown('Procesando...');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [data?.nextFundingTime]);

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="h-7 w-20 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Funding Rate no disponible</span>
        </div>
      </Card>
    );
  }

  const hasSqueezeRisk = data.signal === 'long_squeeze_risk' || data.signal === 'short_squeeze_risk';
  const levelColor = getFundingLevelColor(data.level);

  const getCardBg = () => {
    if (data.signal === 'long_squeeze_risk') return 'bg-danger/10 border-danger/20';
    if (data.signal === 'short_squeeze_risk') return 'bg-success/10 border-success/20';
    return '';
  };

  const getBadgeVariant = (): 'success' | 'warning' | 'danger' | 'info' => {
    if (data.level === 'extreme_positive') return 'danger';
    if (data.level === 'high_positive') return 'warning';
    if (data.level === 'extreme_negative' || data.level === 'negative') return 'success';
    return 'info';
  };

  return (
    <Card className={`border ${getCardBg()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-info" />
          <span className="text-sm font-medium text-muted-foreground">Funding Rate</span>
          <InfoTooltip content="Tasa que pagan los longs a los shorts (o viceversa) cada 8 horas. Funding positivo alto indica muchos longs apalancados." />
        </div>
        <Badge variant={getBadgeVariant()} className="text-xs">
          {getFundingLevelLabel(data.level)}
        </Badge>
      </div>

      {/* Valor principal y countdown */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-bold ${levelColor}`}>
          {formatFundingRate(data.fundingRatePercent)}
        </span>
        
        {/* Countdown */}
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Próximo en</div>
          <div className="text-xs font-mono font-medium text-foreground">{countdown}</div>
        </div>
      </div>

      {/* Interpretación */}
      <div className={`text-xs ${levelColor}`}>
        {data.interpretation}
      </div>

      {/* Alerta de squeeze risk */}
      {hasSqueezeRisk && (
        <div className={`mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded ${
          data.signal === 'long_squeeze_risk' 
            ? 'bg-danger/20 text-danger' 
            : 'bg-success/20 text-success'
        }`}>
          <AlertTriangle className="w-3 h-3" />
          <span>
            {data.signal === 'long_squeeze_risk' 
              ? 'Riesgo de barrido de longs' 
              : 'Riesgo de short squeeze'}
          </span>
        </div>
      )}
    </Card>
  );
}
