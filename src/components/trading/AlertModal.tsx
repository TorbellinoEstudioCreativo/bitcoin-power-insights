import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AlertType, AlertDirection } from "@/hooks/useAlerts";

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (alert: {
    type: AlertType;
    name: string;
    targetPrice: number;
    direction: AlertDirection;
    active: boolean;
  }) => boolean;
  currentPrice?: number;
}

const alertTypeOptions: { value: AlertType; label: string; icon: string }[] = [
  { value: 'price_target', label: 'Precio Objetivo', icon: '🎯' },
  { value: 'stop_loss', label: 'Stop-Loss', icon: '⚠️' },
  { value: 'margin_call', label: 'Margin Call', icon: '🚨' },
];

export function AlertModal({ open, onOpenChange, onSave, currentPrice }: AlertModalProps) {
  const [type, setType] = useState<AlertType>('price_target');
  const [name, setName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<AlertDirection>('above');

  const handleSave = () => {
    const price = parseFloat(targetPrice.replace(/,/g, ''));
    if (isNaN(price) || price <= 0) {
      return;
    }

    const alertName = name.trim() || `${alertTypeOptions.find(o => o.value === type)?.label}: $${price.toLocaleString()}`;

    const success = onSave({
      type,
      name: alertName,
      targetPrice: price,
      direction,
      active: true,
    });

    if (success) {
      // Reset form
      setType('price_target');
      setName('');
      setTargetPrice('');
      setDirection('above');
      onOpenChange(false);
    }
  };

  const handlePriceChange = (value: string) => {
    // Allow only numbers and commas
    const cleaned = value.replace(/[^\d,]/g, '');
    setTargetPrice(cleaned);
  };

  const parsedPrice = parseFloat(targetPrice.replace(/,/g, '')) || 0;
  const isValid = parsedPrice > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔔 Nueva Alerta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alert Type */}
          <div className="space-y-2">
            <Label>Tipo de Alerta</Label>
            <Select value={type} onValueChange={(v) => setType(v as AlertType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alertTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Name (optional) */}
          <div className="space-y-2">
            <Label>Nombre (opcional)</Label>
            <Input
              placeholder="Ej: Mi objetivo de fin de año"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Target Price */}
          <div className="space-y-2">
            <Label>Precio Objetivo (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                className="pl-7 font-mono"
                placeholder="100,000"
                value={targetPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
              />
            </div>
            {currentPrice && (
              <p className="text-xs text-muted-foreground">
                Precio actual: ${currentPrice.toLocaleString()}
              </p>
            )}
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>Disparar cuando el precio...</Label>
            <RadioGroup value={direction} onValueChange={(v) => setDirection(v as AlertDirection)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="above" id="above" />
                <Label htmlFor="above" className="font-normal cursor-pointer">
                  ↑ Suba hasta este nivel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="below" id="below" />
                <Label htmlFor="below" className="font-normal cursor-pointer">
                  ↓ Baje hasta este nivel
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview */}
          {isValid && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Vista previa:</span>{' '}
                Se disparará cuando BTC {direction === 'above' ? 'suba a' : 'baje a'}{' '}
                <span className="font-mono font-medium text-primary">
                  ${parsedPrice.toLocaleString()}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Crear Alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
