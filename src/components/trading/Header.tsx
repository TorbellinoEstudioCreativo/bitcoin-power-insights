import { useState } from "react";
import { Settings, TrendingUp, Info, Sun, Moon, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PowerLawInfoModal } from "./PowerLawInfoModal";
import { AlertsManager } from "./AlertsManager";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { playAlertSound } from "@/lib/alertSounds";
import type { Alert, AlertType, AlertDirection } from "@/hooks/useAlerts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  activeTab?: 'powerlaw' | 'intraday';
  alerts?: Alert[];
  activeAlertsCount?: number;
  canAddMore?: boolean;
  maxAlerts?: number;
  currentPrice?: number;
  onAddAlert?: (alert: {
    type: AlertType;
    name: string;
    targetPrice: number;
    direction: AlertDirection;
    active: boolean;
  }) => boolean;
  onToggleAlert?: (id: string) => void;
  onDeleteAlert?: (id: string) => void;
  onResetAlert?: (id: string) => void;
}

export function Header({
  activeTab = 'powerlaw',
  alerts = [],
  activeAlertsCount = 0,
  canAddMore = true,
  maxAlerts = 5,
  currentPrice,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  onResetAlert,
}: HeaderProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  // Dynamic title based on active tab
  const titleKey = activeTab === 'intraday' ? 'titleIntraday' : 'title';
  const subtitleKey = activeTab === 'intraday' ? 'subtitleIntraday' : 'subtitle';

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('header', titleKey)}
            </h1>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">
                {t('header', subtitleKey)}
              </p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-0.5 hover:bg-muted rounded-full transition-colors"
                aria-label={t('header', 'infoAriaLabel')}
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setLanguage('es')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                language === 'es'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🇪🇸 ES
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                language === 'en'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🇺🇸 EN
            </button>
          </div>

          {onAddAlert && onToggleAlert && onDeleteAlert && onResetAlert && (
            <AlertsManager
              alerts={alerts}
              activeAlertsCount={activeAlertsCount}
              canAddMore={canAddMore}
              maxAlerts={maxAlerts}
              currentPrice={currentPrice}
              onAddAlert={onAddAlert}
              onToggleAlert={onToggleAlert}
              onDeleteAlert={onDeleteAlert}
              onResetAlert={onResetAlert}
            />
          )}
          
          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('settings', 'title')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Theme Toggle */}
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" />
                    {t('settings', 'themeLight')}
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" />
                    {t('settings', 'themeDark')}
                  </>
                )}
              </DropdownMenuItem>
              
              {/* Test Sound */}
              <DropdownMenuItem onClick={() => playAlertSound('success')}>
                <Volume2 className="w-4 h-4 mr-2" />
                {t('settings', 'testSound')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <PowerLawInfoModal 
        open={showInfoModal} 
        onOpenChange={setShowInfoModal} 
      />
    </>
  );
}
