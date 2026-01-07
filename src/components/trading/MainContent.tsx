import { Card } from "./Card";
import { AlertTriangle } from "lucide-react";

export function MainContent() {
  return (
    <main className="flex-1 p-6 overflow-y-auto">
      {/* Chart Placeholder */}
      <Card className="h-[500px] flex items-center justify-center mb-8">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-lg font-medium">Gráfico Power Law</p>
          <p className="text-sm">Se implementará en Fase 4</p>
        </div>
      </Card>

      {/* Risk Section Placeholder */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-warning" />
          Riesgo y Apalancamiento
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["Colateral", "Préstamo", "BTC Extra", "Exposición Total"].map((title) => (
            <Card key={title}>
              <div className="text-sm text-muted-foreground mb-1">{title}</div>
              <div className="text-2xl font-bold text-foreground">$0</div>
              <div className="text-xs text-muted-foreground mt-1">
                Se calculará en Fase 2
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
