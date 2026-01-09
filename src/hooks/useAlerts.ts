import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { playAlertSound, getSoundTypeForAlert } from "@/lib/alertSounds";

export type AlertType = 'price_target' | 'stop_loss' | 'margin_call' | 'cycle_bottom' | 'cycle_top' | 'golden_cross' | 'death_cross' | 'corridor_breach';
export type AlertDirection = 'above' | 'below';

export interface Alert {
  id: string;
  type: AlertType;
  name: string;
  targetPrice: number;
  direction: AlertDirection;
  active: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

interface AlertsState {
  alerts: Alert[];
  initialInvestment: number;
  btcAmountOwned: number;
}

const STORAGE_KEY = 'btc-powerlaw-alerts';
const MAX_ALERTS = 5;

const defaultState: AlertsState = {
  alerts: [],
  initialInvestment: 15000,
  btcAmountOwned: 0,
};

function loadFromStorage(): AlertsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading alerts from localStorage:', e);
  }
  return defaultState;
}

function saveToStorage(state: AlertsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving alerts to localStorage:', e);
  }
}

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getNotificationMessage(alert: Alert): string {
  const priceFormatted = `$${alert.targetPrice.toLocaleString()}`;
  switch (alert.type) {
    case 'price_target':
      return `🎯 Bitcoin alcanzó tu precio objetivo: ${priceFormatted}`;
    case 'stop_loss':
      return `⚠️ Stop-Loss activado en ${priceFormatted}`;
    case 'margin_call':
      return `🚨 ALERTA: Precio cerca de Margin Call!`;
    case 'cycle_bottom':
      return `🟢 Posible bottom de ciclo - Ratio histórico alcanzado`;
    case 'cycle_top':
      return `🔴 Posible top de ciclo - Considerar tomar ganancias`;
    case 'golden_cross':
      return `📈 Golden Cross Power Law - Inicio de bull run`;
    case 'death_cross':
      return `📉 Death Cross Power Law - Inicio de bear market`;
    case 'corridor_breach':
      return `⚠️ Bitcoin fuera del corredor histórico`;
    default:
      return `Alerta disparada: ${priceFormatted}`;
  }
}

function sendBrowserNotification(alert: Alert): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Bitcoin Power Law Analyzer', {
      body: getNotificationMessage(alert),
      icon: '/favicon.ico',
      tag: alert.id,
    });
  }
}

export function useAlerts(currentPrice?: number) {
  const [state, setState] = useState<AlertsState>(loadFromStorage);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Check alerts when price changes
  useEffect(() => {
    if (!currentPrice) return;

    setState(prev => {
      let hasChanges = false;
      const updatedAlerts = prev.alerts.map(alert => {
        if (!alert.active || alert.triggered) return alert;

        const shouldTrigger =
          (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.direction === 'below' && currentPrice <= alert.targetPrice);

        if (shouldTrigger) {
          hasChanges = true;
          
          // 1. FIRST: Play sound
          const soundType = getSoundTypeForAlert(alert.type);
          playAlertSound(soundType);
          
          // 2. THEN: Browser notification
          sendBrowserNotification(alert);
          
          // 3. THEN: Toast in app
          toast.success(`🔔 ${alert.name}`, {
            description: getNotificationMessage(alert),
          });

          return {
            ...alert,
            triggered: true,
            triggeredAt: new Date().toISOString(),
          };
        }
        return alert;
      });

      if (hasChanges) {
        return { ...prev, alerts: updatedAlerts };
      }
      return prev;
    });
  }, [currentPrice]);

  const addAlert = useCallback((alertData: Omit<Alert, 'id' | 'triggered' | 'createdAt' | 'triggeredAt'>): boolean => {
    if (state.alerts.length >= MAX_ALERTS) {
      toast.error('Límite alcanzado', {
        description: `Máximo ${MAX_ALERTS} alertas permitidas`,
      });
      return false;
    }

    const newAlert: Alert = {
      ...alertData,
      id: generateId(),
      triggered: false,
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      alerts: [...prev.alerts, newAlert],
    }));

    toast.success('Alerta creada', {
      description: newAlert.name,
    });
    return true;
  }, [state.alerts.length]);

  const updateAlert = useCallback((id: string, updates: Partial<Alert>): void => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === id ? { ...alert, ...updates } : alert
      ),
    }));
  }, []);

  const deleteAlert = useCallback((id: string): void => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(alert => alert.id !== id),
    }));
    toast.info('Alerta eliminada');
  }, []);

  const toggleAlert = useCallback((id: string): void => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === id 
          ? { ...alert, active: !alert.active, triggered: false, triggeredAt: undefined } 
          : alert
      ),
    }));
  }, []);

  const resetAlert = useCallback((id: string): void => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === id 
          ? { ...alert, triggered: false, triggeredAt: undefined } 
          : alert
      ),
    }));
  }, []);

  const activeAlertsCount = state.alerts.filter(a => a.active && !a.triggered).length;
  const canAddMore = state.alerts.length < MAX_ALERTS;

  return {
    alerts: state.alerts,
    activeAlertsCount,
    canAddMore,
    maxAlerts: MAX_ALERTS,
    addAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    resetAlert,
  };
}
