import { Card } from "./Card";
import { AnimatedNumber } from "./AnimatedNumber";
import { calcularScoreOportunidad, getOpportunityMessage } from "@/lib/technicalAnalysis";
import { useLanguage } from "@/contexts/LanguageContext";

interface OpportunityScoreProps {
  ratio: number;
}

export function OpportunityScore({ ratio }: OpportunityScoreProps) {
  const { language } = useLanguage();
  const score = calcularScoreOportunidad(ratio);
  const { emoji, message } = getOpportunityMessage(score, language);
  
  // Calculate indicator position (clamped between 2% and 98%)
  const indicatorPosition = Math.min(Math.max(score, 2), 98);
  
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎯</span>
        <span className="text-sm font-bold text-foreground">
          {language === 'es' ? 'Score de Oportunidad' : 'Opportunity Score'}
        </span>
      </div>
      
      {/* Gradient bar with indicator */}
      <div className="relative w-full h-4 bg-gradient-to-r from-danger via-warning to-success rounded-full mb-3">
        <div 
          className="absolute h-6 w-6 bg-background rounded-full shadow-lg border-2 border-foreground transition-all duration-500"
          style={{ 
            left: `${indicatorPosition}%`, 
            top: '50%',
            transform: 'translate(-50%, -50%)' 
          }}
        />
      </div>
      
      {/* Score labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
        <span>{language === 'es' ? 'Vender' : 'Sell'}</span>
        <span>{language === 'es' ? 'Neutral' : 'Neutral'}</span>
        <span>{language === 'es' ? 'Comprar' : 'Buy'}</span>
      </div>
      
      {/* Big number display */}
      <div className="text-center">
        <div className={`text-4xl font-bold ${
          score > 60 ? 'text-success' : 
          score > 40 ? 'text-info' : 
          score > 20 ? 'text-warning' : 
          'text-danger'
        }`}>
          <AnimatedNumber value={score} suffix="/100" />
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {emoji} {message}
        </div>
      </div>
    </Card>
  );
}
