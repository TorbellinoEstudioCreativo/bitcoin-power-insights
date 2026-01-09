import { Card } from "./Card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { NivelSoporte } from "@/lib/technicalAnalysis";
import { useLanguage } from "@/contexts/LanguageContext";

interface SupportResistancePanelProps {
  soportes: NivelSoporte[];
  resistencias: NivelSoporte[];
  precioActual: number;
}

export function SupportResistancePanel({ 
  soportes, 
  resistencias, 
  precioActual 
}: SupportResistancePanelProps) {
  const { language } = useLanguage();
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        📊 {language === 'es' ? 'Soportes y Resistencias' : 'Support & Resistance'}
      </h3>
      
      {/* Current Price Reference */}
      <div className="mb-4 p-2 bg-bitcoin/10 rounded-lg border border-bitcoin/30 text-center">
        <span className="text-xs text-muted-foreground">
          {language === 'es' ? 'Precio Actual' : 'Current Price'}
        </span>
        <div className="text-lg font-bold text-bitcoin">
          ${precioActual.toLocaleString()}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supports */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-success" />
            <span className="text-sm font-bold text-success">
              {language === 'es' ? 'SOPORTES' : 'SUPPORTS'}
            </span>
          </div>
          
          <div className="space-y-2">
            {soportes.length === 0 ? (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                {language === 'es' 
                  ? 'Sin soportes detectados'
                  : 'No supports detected'}
              </div>
            ) : (
              soportes.slice(0, 3).map((soporte, idx) => (
                <div 
                  key={`support-${idx}`}
                  className="p-2 rounded-lg bg-success/10 border border-success/30"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-success">#{idx + 1}</span>
                      <span className="text-sm font-bold text-foreground">
                        ${soporte.precio.toLocaleString()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {soporte.nombre}
                      </span>
                    </div>
                    <span className="text-xs text-success font-medium">
                      -{soporte.distancia.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {soporte.razon}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Resistances */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-danger" />
            <span className="text-sm font-bold text-danger">
              {language === 'es' ? 'RESISTENCIAS' : 'RESISTANCES'}
            </span>
          </div>
          
          <div className="space-y-2">
            {resistencias.length === 0 ? (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                {language === 'es' 
                  ? 'Sin resistencias detectadas'
                  : 'No resistances detected'}
              </div>
            ) : (
              resistencias.slice(0, 3).map((resistencia, idx) => (
                <div 
                  key={`resistance-${idx}`}
                  className="p-2 rounded-lg bg-danger/10 border border-danger/30"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-danger">#{idx + 1}</span>
                      <span className="text-sm font-bold text-foreground">
                        ${resistencia.precio.toLocaleString()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {resistencia.nombre}
                      </span>
                    </div>
                    <span className="text-xs text-success font-medium">
                      +{resistencia.distancia.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {resistencia.razon}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
