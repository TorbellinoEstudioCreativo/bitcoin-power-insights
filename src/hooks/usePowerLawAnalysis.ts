import { useMemo } from 'react';
import { GENESIS_DATE, BTC_PRICE, INTEREST_RATE } from '@/lib/constants';

/**
 * Power Law formula: P(t) = 10^(-1.847796462) × t^(5.616314045)
 * Where t = years since genesis
 * CRITICAL: Use ALL decimals - do not round!
 */
export const calcularPrecioPowerLaw = (years: number): number => {
  if (years <= 0) return 0;
  return Math.pow(10, -1.847796462) * Math.pow(years, 5.616314045);
};

export interface PowerLawAnalysis {
  // Time metrics
  daysSinceGenesis: number;
  yearsSinceGenesis: number;
  
  // Price metrics
  btcPrice: number;
  precioModelo: number;
  ratio: number;
  techo: number;
  piso: number;
  
  // Valuation zone
  zona: string;
  colorZona: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info';
  scoreOportunidad: number;
  
  // Portfolio recommendations
  porcentajePortfolio: number;
  colateralUSD: number;
  colateralBTC: number;
  
  // Loan calculations
  ltvBase: number;
  ltvAjustado: number;
  prestamoUSD: number;
  compraBTC: number;
  exposicionTotal: number;
  apalancamiento: number;
  
  // Critical prices
  precioLiquidacion: number;
  precioMarginCall: number;
  margenLiquidacion: number;
  
  // Security scores
  scoreSeguridad: number;
  scoreTotal: number;
  
  // Final decision
  decision: string;
  decisionColor: string;
  nivelRiesgo: string;
  nivelRiesgoEmoji: string;
  
  // 6-month projections
  costoIntereses6m: number;
  gananciaNeta: number;
  retornoPorcentaje: number;
  
  // Suggested leverage
  apalancamientoSugerido: string;
  apalancamientoRiesgo: string;
}

export function usePowerLawAnalysis(portfolioValue: number): PowerLawAnalysis {
  return useMemo(() => {
    // 1. Calculate days and years since genesis
    const currentDate = new Date();
    const daysSinceGenesis = Math.floor(
      (currentDate.getTime() - GENESIS_DATE.getTime()) / (1000 * 60 * 60 * 24)
    );
    const yearsSinceGenesis = daysSinceGenesis / 365.25;

    // 2. Calculate model price (fair value)
    const precioModelo = calcularPrecioPowerLaw(yearsSinceGenesis);

    // 3. Calculate ratio (key metric)
    const ratio = BTC_PRICE / precioModelo;

    // 4. Calculate bands
    const techo = precioModelo * 3.0;  // Extreme overvaluation
    const piso = precioModelo * 0.5;   // Historical floor

    // 5. Determine valuation zone
    let zona: string;
    let colorZona: string;
    let badgeVariant: 'success' | 'warning' | 'danger' | 'info';
    let scoreOportunidad: number;

    if (ratio < 0.3) {
      zona = "EXTREMADAMENTE INFRAVALORADO";
      colorZona = "text-success";
      badgeVariant = "success";
      scoreOportunidad = 100;
    } else if (ratio < 0.5) {
      zona = "PISO HISTÓRICO";
      colorZona = "text-success";
      badgeVariant = "success";
      scoreOportunidad = 90;
    } else if (ratio <= 0.85) {
      zona = "INFRAVALORADO";
      colorZona = "text-success";
      badgeVariant = "success";
      scoreOportunidad = 75;
    } else if (ratio < 1.2) {
      zona = "JUSTO (FAIR VALUE)";
      colorZona = "text-info";
      badgeVariant = "info";
      scoreOportunidad = 50;
    } else if (ratio < 2.0) {
      zona = "SOBREVALORADO";
      colorZona = "text-warning";
      badgeVariant = "warning";
      scoreOportunidad = 30;
    } else if (ratio < 3.0) {
      zona = "TECHO HISTÓRICO";
      colorZona = "text-danger";
      badgeVariant = "danger";
      scoreOportunidad = 10;
    } else {
      zona = "EXTREMADAMENTE SOBREVALORADO";
      colorZona = "text-danger";
      badgeVariant = "danger";
      scoreOportunidad = 0;
    }

    // 6. Portfolio percentage recommended by zone
    let porcentajePortfolio: number;
    if (ratio < 0.3) porcentajePortfolio = 80;      // Extreme
    else if (ratio < 0.5) porcentajePortfolio = 60; // Floor
    else if (ratio <= 0.85) porcentajePortfolio = 40; // Undervalued
    else if (ratio < 1.2) porcentajePortfolio = 20; // Fair
    else porcentajePortfolio = 0;                    // Overvalued

    // 7. Calculate loan amounts
    const colateralUSD = portfolioValue * (porcentajePortfolio / 100);
    const colateralBTC = colateralUSD / BTC_PRICE;

    // LTV (Loan-to-Value)
    const ltvBase = 0.60; // 60% base
    const ltvAjustado = ratio > 1.0 ? ltvBase * 0.85 : ltvBase;

    const prestamoUSD = colateralUSD * ltvAjustado;
    const compraBTC = prestamoUSD / BTC_PRICE;
    const exposicionTotal = colateralBTC + compraBTC;
    const apalancamiento = colateralBTC > 0 ? exposicionTotal / colateralBTC : 0;

    // 8. Critical prices
    const precioLiquidacion = colateralBTC > 0 ? prestamoUSD / (colateralBTC * 0.91) : 0; // 91% LTV
    const precioMarginCall = colateralBTC > 0 ? prestamoUSD / (colateralBTC * 0.85) : 0;  // 85% LTV
    const margenLiquidacion = precioLiquidacion > 0 ? ((BTC_PRICE - precioLiquidacion) / BTC_PRICE) * 100 : 0;

    // 9. Security score
    let scoreSeguridad: number;
    if (ltvAjustado < 0.50) scoreSeguridad = 100;
    else if (ltvAjustado < 0.60) scoreSeguridad = 80;
    else if (ltvAjustado < 0.70) scoreSeguridad = 60;
    else scoreSeguridad = 40;

    // 10. Total score and decision
    const scoreTotal = scoreOportunidad * 0.6 + scoreSeguridad * 0.4;

    let decision: string;
    let decisionColor: string;
    let nivelRiesgo: string;
    let nivelRiesgoEmoji: string;
    
    if (scoreTotal >= 70) {
      decision = "EJECUTAR PRÉSTAMO";
      decisionColor = "text-success";
      nivelRiesgo = "BAJO";
      nivelRiesgoEmoji = "🟢";
    } else if (scoreTotal >= 50) {
      decision = "CONSIDERAR CON PRECAUCIÓN";
      decisionColor = "text-warning";
      nivelRiesgo = "MEDIO";
      nivelRiesgoEmoji = "🟡";
    } else {
      decision = "NO SOLICITAR";
      decisionColor = "text-danger";
      nivelRiesgo = "ALTO";
      nivelRiesgoEmoji = "🔴";
    }

    // 11. 6-month projections
    const costoIntereses6m = prestamoUSD * (INTEREST_RATE / 2); // 6 months = half year
    const valorFuturoSiFairValue = exposicionTotal * precioModelo;
    const valorActual = exposicionTotal * BTC_PRICE;
    const gananciaNeta = valorFuturoSiFairValue - valorActual - costoIntereses6m;
    const retornoPorcentaje = colateralUSD > 0 ? (gananciaNeta / colateralUSD) * 100 : 0;

    // 12. Suggested leverage based on zone
    let apalancamientoSugerido: string;
    let apalancamientoRiesgo: string;
    if (ratio < 0.5) {
      apalancamientoSugerido = "2x";
      apalancamientoRiesgo = "bajo";
    } else if (ratio <= 0.85) {
      apalancamientoSugerido = "1.5x";
      apalancamientoRiesgo = "bajo";
    } else if (ratio < 1.2) {
      apalancamientoSugerido = "1.2x";
      apalancamientoRiesgo = "medio";
    } else {
      apalancamientoSugerido = "1x (sin apalancamiento)";
      apalancamientoRiesgo = "alto";
    }

    return {
      daysSinceGenesis,
      yearsSinceGenesis,
      btcPrice: BTC_PRICE,
      precioModelo,
      ratio,
      techo,
      piso,
      zona,
      colorZona,
      badgeVariant,
      scoreOportunidad,
      porcentajePortfolio,
      colateralUSD,
      colateralBTC,
      ltvBase,
      ltvAjustado,
      prestamoUSD,
      compraBTC,
      exposicionTotal,
      apalancamiento,
      precioLiquidacion,
      precioMarginCall,
      margenLiquidacion,
      scoreSeguridad,
      scoreTotal,
      decision,
      decisionColor,
      nivelRiesgo,
      nivelRiesgoEmoji,
      costoIntereses6m,
      gananciaNeta,
      retornoPorcentaje,
      apalancamientoSugerido,
      apalancamientoRiesgo,
    };
  }, [portfolioValue]);
}
