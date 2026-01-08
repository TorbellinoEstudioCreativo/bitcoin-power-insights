import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface PowerLawInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PowerLawInfoModal({ open, onOpenChange }: PowerLawInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            📐 El Modelo Power Law de Bitcoin
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Sección 1: ¿Qué es? */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                ¿Qué es el Modelo Power Law?
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                El modelo Power Law (Ley de Potencia) es una ecuación matemática desarrollada por{" "}
                <span className="text-foreground font-medium">Giovanni Santostasi</span>, físico y analista
                de Bitcoin, que describe el crecimiento del precio de Bitcoin a lo largo del tiempo
                con una precisión asombrosa desde su génesis en 2009.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                A diferencia de otros modelos (como Stock-to-Flow), el Power Law se basa puramente
                en la relación matemática entre el{" "}
                <span className="text-foreground font-medium">tiempo transcurrido</span> y el{" "}
                <span className="text-foreground font-medium">precio</span>,
                sin asumir escasez, producción o factores externos.
              </p>
            </section>

            {/* Sección 2: La Fórmula */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                🧮 La Fórmula Matemática
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-center">
                <span className="text-foreground">P(t) = </span>
                <span className="text-primary">10</span>
                <sup className="text-xs">-1.847796462</sup>
                <span className="text-foreground"> × </span>
                <span className="text-primary">t</span>
                <sup className="text-xs">5.616314045</sup>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="text-foreground font-medium">Donde:</span></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="font-mono text-primary">P(t)</span> = Precio de Bitcoin en USD</li>
                  <li><span className="font-mono text-primary">t</span> = Años desde el génesis (3 enero 2009)</li>
                  <li><span className="font-mono">-1.847796462</span> = Coeficiente de escala</li>
                  <li><span className="font-mono">5.616314045</span> = Exponente de potencia</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground bg-primary/10 rounded-lg p-3">
                💡 Estos valores se derivaron mediante regresión logarítmica sobre todos los datos
                históricos de Bitcoin desde 2009.
              </p>
            </section>

            {/* Sección 3: ¿Cómo Funciona? */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                ⚙️ ¿Cómo Funciona?
              </h3>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
                  <span><span className="text-foreground font-medium">Cálculo del Tiempo:</span> Se calcula cuántos días han pasado desde el 3 de enero de 2009 (bloque génesis) y se convierte a años.</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
                  <span><span className="text-foreground font-medium">Aplicación de la Fórmula:</span> Se eleva el tiempo a la potencia 5.616 y se multiplica por 10^-1.847, obteniendo el "precio justo" o fair value.</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
                  <span><span className="text-foreground font-medium">Ratio de Valoración:</span> Se compara el precio real con el modelo (Ratio = Precio Real / Precio Modelo). Si el ratio es menor que 1.0, Bitcoin está infravalorado.</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</span>
                  <span><span className="text-foreground font-medium">Bandas de Soporte/Resistencia:</span> Se calculan multiplicando el modelo por 3.0 (techo histórico) y 0.5 (piso histórico).</span>
                </li>
              </ol>
            </section>

            {/* Sección 4: Interpretación */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                📊 Interpretación de Zonas
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <span className="text-green-400 font-medium">Ratio {'<'} 0.8:</span>
                    <span className="text-muted-foreground ml-2">Bitcoin INFRAVALORADO - Oportunidad de compra</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <span className="text-2xl">🔵</span>
                  <div>
                    <span className="text-blue-400 font-medium">Ratio 0.8 - 1.2:</span>
                    <span className="text-muted-foreground ml-2">JUSTO - Precio cerca del fair value</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-2xl">🟡</span>
                  <div>
                    <span className="text-yellow-400 font-medium">Ratio 1.2 - 2.0:</span>
                    <span className="text-muted-foreground ml-2">SOBREVALORADO - Precaución</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <span className="text-red-400 font-medium">Ratio {'>'} 2.0:</span>
                    <span className="text-muted-foreground ml-2">TECHO HISTÓRICO - Alto riesgo de corrección</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección 5: Evidencia Histórica */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                📈 Evidencia Histórica
              </h3>
              <p className="text-muted-foreground">
                El modelo Power Law ha mostrado una correlación extraordinaria con el precio de Bitcoin:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><span className="text-foreground font-medium">R² = 0.94+</span> (94%+ de correlación) en escala logarítmica</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Los <span className="text-foreground font-medium">pisos de mercado</span> (2011, 2015, 2018, 2022) coinciden con ratio ~0.5</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Los <span className="text-foreground font-medium">techos de mercado</span> (2013, 2017, 2021) coinciden con ratio ~3.0</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>El modelo se mantiene válido incluso después de <span className="text-foreground font-medium">4 ciclos halving</span></span>
                </li>
              </ul>
            </section>

            {/* Sección 6: Por Qué Funciona */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                🤔 ¿Por Qué Funciona?
              </h3>
              <p className="text-muted-foreground">
                Aunque nadie sabe con certeza por qué el Power Law funciona tan bien, hay varias teorías:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><span className="text-foreground font-medium">Adopción Exponencial:</span> Bitcoin sigue una curva de adopción similar a otras tecnologías revolucionarias (internet, smartphones)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><span className="text-foreground font-medium">Efecto de Red:</span> El valor de Bitcoin crece exponencialmente con cada nuevo usuario (Ley de Metcalfe)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><span className="text-foreground font-medium">Escasez Digital:</span> La oferta limitada (21M BTC) combinada con demanda creciente genera presión alcista predecible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><span className="text-foreground font-medium">Auto-Cumplimiento:</span> Los inversores conocen el modelo y toman decisiones basadas en él, reforzando su validez</span>
                </li>
              </ul>
            </section>

            {/* Sección 7: Limitaciones */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                ⚠️ Limitaciones y Advertencias
              </h3>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span>El modelo es una <span className="text-foreground font-medium">proyección matemática</span>, no una garantía</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span><span className="text-foreground font-medium">Eventos cisne negro</span> (regulación extrema, hackeos masivos, guerras) pueden invalidar el modelo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span>El pasado no garantiza el futuro - Bitcoin podría entrar en <span className="text-foreground font-medium">fase de saturación</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span>El modelo no considera <span className="text-foreground font-medium">factores macroeconómicos</span> (inflación, tasas de interés, etc.)</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Sección 8: Aplicación Práctica */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                💼 ¿Cómo Usar Este Modelo?
              </h3>
              <p className="text-muted-foreground">
                Esta herramienta te ayuda a:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><span className="text-foreground font-medium">Identificar oportunidades:</span> Comprar cuando ratio {'<'} 0.8</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><span className="text-foreground font-medium">Gestionar riesgo:</span> Reducir exposición cuando ratio {'>'} 2.0</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><span className="text-foreground font-medium">Planificar estrategias:</span> Usar préstamos colateralizados cuando BTC está infravalorado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span><span className="text-foreground font-medium">Proyectar escenarios:</span> Ver dónde podría estar el precio en 6 meses, 1 año, 5 años</span>
                </li>
              </ul>
            </section>

            {/* Footer con Referencias */}
            <section className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">📚 Referencias y Lecturas</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  •{" "}
                  <a 
                    href="https://www.lookintobitcoin.com/charts/bitcoin-power-law-corridor/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Bitcoin Power Law - Look Into Bitcoin
                  </a>
                </p>
                <p>
                  •{" "}
                  <a 
                    href="https://giovannisantostasi.medium.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Artículos de Giovanni Santostasi
                  </a>
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                💡 Este modelo es solo educativo. Siempre haz tu propia investigación (DYOR).
              </p>
            </section>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
