import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface PowerLawInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PowerLawInfoModal({ open, onOpenChange }: PowerLawInfoModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            📐 {t('modal', 'title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4 min-h-0">
          <div className="space-y-6 pb-4">
            {/* Section 1: What is it? */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                {t('modal', 'whatIs')}
              </h3>
              <p 
                className="text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t('modal', 'whatIsContent1') }}
              />
              <p 
                className="text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t('modal', 'whatIsContent2') }}
              />
            </section>

            {/* Section 2: The Formula */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                🧮 {t('modal', 'formula')}
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
                <p><span className="text-foreground font-medium">{t('modal', 'formulaWhere')}</span></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="font-mono text-primary">P(t)</span> = {t('modal', 'formulaPrice')}</li>
                  <li><span className="font-mono text-primary">t</span> = {t('modal', 'formulaYears')}</li>
                  <li><span className="font-mono">-1.847796462</span> = {t('modal', 'formulaScale')}</li>
                  <li><span className="font-mono">5.616314045</span> = {t('modal', 'formulaExponent')}</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground bg-primary/10 rounded-lg p-3">
                {t('modal', 'formulaNote')}
              </p>
            </section>

            {/* Section 3: How it works */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                ⚙️ {t('modal', 'howWorks')}
              </h3>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'step1') }} />
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'step2') }} />
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'step3') }} />
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'step4') }} />
                </li>
              </ol>
            </section>

            {/* Section 4: Interpretation */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                📊 {t('modal', 'interpretation')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <span className="text-success font-medium">Ratio {'<'} 0.8:</span>
                    <span className="text-muted-foreground ml-2">{t('modal', 'zoneGreen')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
                  <span className="text-2xl">🔵</span>
                  <div>
                    <span className="text-info font-medium">Ratio 0.8 - 1.2:</span>
                    <span className="text-muted-foreground ml-2">{t('modal', 'zoneBlue')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <span className="text-2xl">🟡</span>
                  <div>
                    <span className="text-warning font-medium">Ratio 1.2 - 2.0:</span>
                    <span className="text-muted-foreground ml-2">{t('modal', 'zoneYellow')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <span className="text-danger font-medium">Ratio {'>'} 2.0:</span>
                    <span className="text-muted-foreground ml-2">{t('modal', 'zoneRed')}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Historical Evidence */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                📈 {t('modal', 'evidence')}
              </h3>
              <p className="text-muted-foreground">
                {t('modal', 'evidenceIntro')}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><span className="text-foreground font-medium">R² = 0.94+</span> {t('modal', 'evidenceR2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'evidenceFloors') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'evidenceCeilings') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'evidenceHalvings') }} />
                </li>
              </ul>
            </section>

            {/* Section 6: Why it works */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                🤔 {t('modal', 'whyWorks')}
              </h3>
              <p className="text-muted-foreground">
                {t('modal', 'whyWorksIntro')}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'adoption') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'network') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'scarcity') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'selfFulfilling') }} />
                </li>
              </ul>
            </section>

            {/* Section 7: Limitations */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                ⚠️ {t('modal', 'limitations')}
              </h3>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span dangerouslySetInnerHTML={{ __html: t('modal', 'limitMath') }} />
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span dangerouslySetInnerHTML={{ __html: t('modal', 'limitBlackSwan') }} />
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span dangerouslySetInnerHTML={{ __html: t('modal', 'limitPast') }} />
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span dangerouslySetInnerHTML={{ __html: t('modal', 'limitMacro') }} />
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 8: How to use */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-primary">
                💼 {t('modal', 'howToUse')}
              </h3>
              <p className="text-muted-foreground">
                {t('modal', 'howToUseIntro')}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'useIdentify') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'useRisk') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'usePlan') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('modal', 'useProject') }} />
                </li>
              </ul>
            </section>

            {/* Footer with References */}
            <section className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">📚 {t('modal', 'references')}</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  •{" "}
                  <a 
                    href="https://www.bitcoinmagazinepro.com/charts/bitcoin-power-law-corridor/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Bitcoin Power Law Corridor - Bitcoin Magazine Pro
                  </a>
                </p>
                <p>
                  •{" "}
                  <a 
                    href="https://www.lookintobitcoin.com/charts/bitcoin-power-law/" 
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
                    {t('modal', 'giovanniArticles')}
                  </a>
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                {t('modal', 'disclaimer')}
              </p>
            </section>
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t('modal', 'understood')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
