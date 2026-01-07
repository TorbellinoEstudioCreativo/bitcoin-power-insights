import { AlertTriangle } from "lucide-react";

export function Footer() {
  return (
    <footer className="h-auto bg-card border-t border-border">
      <div className="px-6 py-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground">Disclaimer:</strong> Esta herramienta es solo para análisis educativo. 
            No constituye asesoría financiera ni recomendación de inversión.
          </p>
        </div>
      </div>
      <div className="px-6 py-2 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
        <span>Bitcoin Power Law Analyzer • Modelo de Giovanni Santostasi</span>
        <span>Datos actualizados: {new Date().toLocaleDateString('es-MX')}</span>
      </div>
    </footer>
  );
}
