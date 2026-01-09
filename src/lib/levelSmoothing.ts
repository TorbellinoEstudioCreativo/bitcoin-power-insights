// Sistema de suavizado de niveles para evitar fluctuaciones excesivas en la UI

interface NivelBase {
  precio: number;
}

// Historial separado para soportes y resistencias
const historialSoportes: NivelBase[][] = [];
const historialResistencias: NivelBase[][] = [];

/**
 * Suaviza los niveles de precio promediando con el historial reciente
 * Esto evita que los precios "salten" con cada actualización del precio de BTC
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
  
  // Promediar niveles similares
  return nuevosNiveles.map((nivelActual) => {
    const preciosSimilares: number[] = [];
    
    historial.forEach(hist => {
      const similar = hist.find(n => 
        Math.abs(n.precio - nivelActual.precio) < nivelActual.precio * 0.03
      );
      
      if (similar) {
        preciosSimilares.push(similar.precio);
      }
    });
    
    const precioPromedio = preciosSimilares.length > 0
      ? preciosSimilares.reduce((sum, p) => sum + p, 0) / preciosSimilares.length
      : nivelActual.precio;
    
    return {
      ...nivelActual,
      precio: Math.round(precioPromedio)
    };
  });
}

/**
 * Limpia el historial (útil al cambiar de estrategia o resetear)
 */
export function limpiarHistorial(): void {
  historialSoportes.length = 0;
  historialResistencias.length = 0;
}
