// Sistema de caché con detección de cambios significativos
// Evita recálculos innecesarios cuando el precio cambia mínimamente

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
  precioBase: number;
}

export class StableCache {
  private cache: Map<string, CachedData<any>> = new Map();
  private lastSignificantPrice: number = 0;
  private lastRecalculationTime: number = 0;
  
  /**
   * Guarda datos en caché con TTL y precio base
   */
  set<T>(key: string, data: T, ttlMinutes: number = 15, precioBase: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
      precioBase
    });
  }
  
  /**
   * Obtiene datos del caché si no han expirado
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Determina si se debe recalcular basado en cambio de precio
   * @param newPrice - Precio actual
   * @param threshold - Umbral de cambio (default 0.5%)
   * @returns true si el cambio es significativo o pasó el TTL
   */
  shouldRecalculate(newPrice: number, threshold: number = 0.005): boolean {
    const now = Date.now();
    
    // Primera vez
    if (this.lastSignificantPrice === 0) {
      this.lastSignificantPrice = newPrice;
      this.lastRecalculationTime = now;
      return true;
    }
    
    // Calcular cambio porcentual
    const change = Math.abs((newPrice - this.lastSignificantPrice) / this.lastSignificantPrice);
    
    // Recalcular si cambio > umbral
    if (change > threshold) {
      return true;
    }
    
    // Recalcular si pasaron 15 minutos (TTL forzado)
    const timeSinceLastRecalc = now - this.lastRecalculationTime;
    if (timeSinceLastRecalc > 15 * 60 * 1000) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Marca que se realizó un recálculo
   */
  markRecalculated(price: number): void {
    this.lastSignificantPrice = price;
    this.lastRecalculationTime = Date.now();
  }
  
  /**
   * Obtiene el cambio porcentual desde el último recálculo
   */
  getPriceChangePercent(currentPrice: number): number {
    if (this.lastSignificantPrice === 0) return 0;
    return ((currentPrice - this.lastSignificantPrice) / this.lastSignificantPrice) * 100;
  }
  
  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
    this.lastSignificantPrice = 0;
    this.lastRecalculationTime = 0;
  }
}

// Instancia global para toda la app
export const globalCache = new StableCache();
