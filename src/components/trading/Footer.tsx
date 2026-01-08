import { AlertTriangle, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      {/* Disclaimer Section */}
      <div className="px-6 py-4 bg-warning/5 border-b border-warning/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Disclaimer Importante
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta herramienta es únicamente para <strong className="text-foreground">análisis educativo</strong>. 
              No constituye asesoría financiera, de inversión, ni recomendación de compra/venta.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El modelo Power Law es una proyección matemática histórica y <strong className="text-foreground">no garantiza resultados futuros</strong>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Los préstamos colateralizados conllevan <strong className="text-danger">riesgo de liquidación</strong>. 
              Siempre haz tu propia investigación (DYOR) y consulta con un asesor financiero antes de tomar decisiones de inversión.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
        <span>Bitcoin Power Law Analyzer • Basado en el modelo de Giovanni Santostasi</span>
        <span>Datos actualizados: {new Date().toLocaleDateString('es-MX')}</span>
      </div>
    </footer>
  );
}
