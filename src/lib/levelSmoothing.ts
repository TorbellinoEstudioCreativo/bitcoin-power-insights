// Sistema de suavizado de niveles para evitar fluctuaciones excesivas en la UI
// Usa suavizado exponencial (70% anterior, 30% nuevo) para cambios menores

interface NivelBase {
  precio: number;
}

// Historial separado para soportes y resistencias
const historialSoportes: NivelBase[][] = [];
const historialResistencias: NivelBase[][] = [];

// Precios anteriores para suavizado exponencial
const preciosAnteriores: Map<string, number> = new Map();

/**
 * Suaviza un precio individual usando peso exponencial
 * @param key - Identificador único del nivel
 * @param newPrice - Precio nuevo calculado
 * @param weight - Peso del valor anterior (default 0.7 = 70%)
 * @param threshold - Umbral de cambio para aplicar suavizado (default 2%)
 */
function smoothSinglePrice(key: string, newPrice: number, weight: number = 0.7, threshold: number = 0.02): number {
  const prevPrice = preciosAnteriores.get(key) || 0;
  
  if (prevPrice === 0) {
    preciosAnteriores.set(key, newPrice);
    return newPrice;
  }
  
  const change = Math.abs((newPrice - prevPrice) / prevPrice);
  
  // Si el cambio es mayor al umbral, usar precio nuevo directamente
  if (change > threshold) {
    preciosAnteriores.set(key, newPrice);
    return newPrice;
  }
  
  // Aplicar suavizado exponencial
  const smoothedPrice = Math.round(prevPrice * weight + newPrice * (1 - weight));
  preciosAnteriores.set(key, smoothedPrice);
  return smoothedPrice;
}

/**
 * Suaviza los niveles de precio promediando con el historial reciente
 * y aplicando suavizado exponencial para cambios pequeños
 */
export function suavizarNiveles<T extends NivelBase>(
  nuevosNiveles: T[],
  tipo: 'soportes' | 'resistencias'
): T[] {
  const historial = tipo === 'soportes' 
    ? historialSoportes 
    : historialResistencias;
  
  // Agregar al historial
  historial.push([...nuevosNiveles]);
  
  // Mantener solo últimos 5
  if (historial.length > 5) {
    historial.shift();
  }
  
  // Si no hay suficiente historial, devolver como está
  if (historial.length < 3) {
    return nuevosNiveles;
  }
  
  // Promediar niveles similares y aplicar suavizado exponencial
  return nuevosNiveles.map((nivelActual, idx) => {
    const preciosSimilares: number[] = [];
    
    historial.forEach(hist => {
      const similar = hist.find(n => 
        Math.abs(n.precio - nivelActual.precio) < nivelActual.precio * 0.03
      );
      
      if (similar) {
        preciosSimilares.push(similar.precio);
      }
    });
    
    // Promedio del historial
    const precioPromedio = preciosSimilares.length > 0
      ? preciosSimilares.reduce((sum, p) => sum + p, 0) / preciosSimilares.length
      : nivelActual.precio;
    
    // Aplicar suavizado exponencial adicional
    const key = `${tipo}_${idx}`;
    const precioFinal = smoothSinglePrice(key, Math.round(precioPromedio));
    
    return {
      ...nivelActual,
      precio: precioFinal
    };
  });
}

/**
 * Limpia el historial (útil al cambiar de estrategia o resetear)
 */
export function limpiarHistorial(): void {
  historialSoportes.length = 0;
  historialResistencias.length = 0;
  preciosAnteriores.clear();
}
