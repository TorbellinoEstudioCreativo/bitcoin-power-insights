export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Header
    header: {
      title: 'Trader Legendario',
      titleIntraday: 'Trader Legendario',
      subtitle: 'Modelo de Giovanni Santostasi',
      subtitleIntraday: 'Trading Intradía Inteligente',
      infoAriaLabel: 'Información sobre el modelo',
      liveMarket: 'En Vivo',
    },
    
    // Portfolio
    portfolio: {
      total: 'Portfolio Total',
      range: 'Rango: $100 - $10,000,000',
      interestRate: 'Tasa de Interés Anual',
      interestHelp: 'Tasa del préstamo en tu plataforma',
      estimatedCost6m: 'Costo estimado a 6 meses:',
    },
    
    // Timeframes
    timeframes: {
      '15d': '15 días',
      '30d': '30 días',
      '3m': '3 meses',
      '1y': '1 año',
      all: 'Todo',
    },
    
    // Right sidebar cards
    sidebar: {
      currentPrice: 'Precio Actual',
      currentPriceTooltip: 'Precio spot de Bitcoin en USD obtenido en tiempo real de Binance',
      fairValue: 'Fair Value (Modelo)',
      fairValueTooltip: 'Precio justo calculado con el modelo Power Law basado en {days} días desde el génesis de Bitcoin (3 enero 2009)',
      powerLawDays: 'Power Law • {days} días desde génesis',
      ratio: 'Ratio (R)',
      ratioTooltip: 'Ratio = Precio Actual / Precio Modelo. Ratio < 1.0 indica que BTC está infravalorado. Ratio > 1.0 indica sobrevaloración.',
      floor: 'Piso (0.5x)',
      fair: 'Fair (1.0x)',
      ceiling: 'Techo (3.0x)',
      belowFairValue: '{percent}% bajo fair value',
      aboveFairValue: '{percent}% sobre fair value',
      aiRecommendation: 'Recomendación IA',
      totalScore: 'Score Total:',
      opportunity: 'Oportunidad:',
      opportunityTooltip: 'Basado en qué tan infravalorado está BTC vs el modelo. Mayor score = mejor oportunidad de compra.',
      security: 'Seguridad:',
      securityTooltip: 'Basado en el LTV del préstamo. Menor LTV = mayor seguridad contra liquidación.',
      riskLevel: 'Nivel de Riesgo',
      usingLastValue: '⚠️ Usando último valor conocido',
      btc: 'Bitcoin (BTC)',
    },
    
    // Zones
    zones: {
      extremelyUndervalued: 'EXTREMADAMENTE INFRAVALORADO',
      historicalFloor: 'PISO HISTÓRICO',
      undervalued: 'INFRAVALORADO',
      fairZone: 'JUSTO (FAIR VALUE)',
      overvalued: 'SOBREVALORADO',
      historicalCeiling: 'TECHO HISTÓRICO',
      extremelyOvervalued: 'EXTREMADAMENTE SOBREVALORADO',
    },
    
    // Main content / Risk section
    main: {
      powerLawChart: 'Gráfico Power Law',
      riskAndLeverage: 'Riesgo y Apalancamiento',
      selectedStrategy: 'Estrategia Seleccionada',
      recommendedByRatio: '✅ Recomendada según ratio actual',
      notRecommended: '⚠️ No recomendada - Solo para análisis',
      notRecommendedTitle: 'Estrategia No Recomendada',
      longWarning: 'Bitcoin está <strong>{percent}% sobre el fair value</strong>. Abrir un LONG en este momento tiene alto riesgo de corrección. La estrategia recomendada es <strong>SHORT</strong>.',
      shortWarning: 'Bitcoin está <strong>cerca o bajo el fair value</strong>. Abrir un SHORT en este momento tiene bajo potencial de ganancia. La estrategia recomendada es <strong>LONG</strong>.',
      
      // Cards
      collateral: 'Colateral',
      collateralTooltip: 'Cantidad de BTC a depositar como garantía del préstamo. Se calcula como % del portfolio según la zona de valoración.',
      loan: 'Préstamo',
      loanTooltip: 'Loan-to-Value: porcentaje del colateral que puedes pedir prestado. Mayor LTV = mayor riesgo de liquidación.',
      additionalBtc: 'BTC Adicional',
      totalExposure: 'Exposición Total',
      totalExposureTooltip: 'Tu posición total en BTC = Colateral + BTC comprado con el préstamo.',
      leverage: 'Apalancamiento:',
      ofPortfolio: '% del portfolio',
      annualRate: 'Tasa: {rate}% anual',
      
      // SHORT cards
      collateralShort: 'Colateral SHORT',
      collateralShortTooltip: 'Cantidad USD a depositar como garantía para la posición corta.',
      exposureShort: 'Exposición SHORT',
      exposureShortTooltip: 'Valor total de la posición corta apalancada.',
      profitIfDrops: 'Ganancia si baja a Modelo',
      profitIfDropsTooltip: 'Ganancia potencial si el precio baja al fair value del Power Law.',
      stopLoss: 'Stop Loss (Liquidación)',
      stopLossTooltip: 'Si el precio SUBE a este nivel, la posición se liquida.',
      return: 'retorno',
      priceUp: 'subida',
      lev: 'Apal:',
      
      // Critical prices
      securityPrices: 'Precios de Seguridad',
      marginCall: 'Margin Call (85% LTV)',
      liquidation: 'Liquidación (91% LTV)',
      marginCallShort: 'Margin Call SHORT',
      liquidationShort: 'Liquidación SHORT',
      requiredDrop: 'Caída necesaria',
      requiredRise: 'Subida necesaria',
      modelFloor: 'Piso Modelo (0.5x)',
      modelCeiling: 'Techo Modelo (3x)',
      safetyMargin: 'Margen de seguridad',
      upsidePotential: 'Potencial alcista',
      
      // Visual bar
      floor: 'Piso',
      ceiling: 'Techo',
      current: 'Actual',
      
      // Leverage table
      leverageTable: 'Tabla de Apalancamiento',
      riskByLeverage: 'Impacto del apalancamiento en precios críticos',
      leverageCol: 'Apal.',
      loanCol: 'Préstamo',
      expositionCol: 'Exposición',
      liqPriceCol: 'P. Liquidación',
      changeCol: 'Cambio',
      riskCol: 'Riesgo',
      recCol: 'Rec.',
      riskLow: 'Bajo',
      riskMedium: 'Medio',
      riskHigh: 'Alto',
      riskVeryHigh: 'Muy Alto',
      
      // Projections
      projections6m: 'Proyección a 6 Meses',
      scenarios: 'Escenarios si BTC alcanza el precio modelo',
      if: 'Si',
      potentialValue: 'Valor potencial',
      interestCost: 'Costo intereses',
      netGain: 'Ganancia neta',
      roi: 'ROI sobre colateral',
      disclaimer: 'Esta proyección asume que BTC alcanza el fair value del modelo. Los resultados reales pueden variar significativamente.',
    },
    
    // Modal
    modal: {
      title: 'El Modelo Power Law de Bitcoin',
      whatIs: '¿Qué es el Modelo Power Law?',
      whatIsContent1: 'El modelo Power Law (Ley de Potencia) es una ecuación matemática desarrollada por <strong>Giovanni Santostasi</strong>, físico y analista de Bitcoin, que describe el crecimiento del precio de Bitcoin a lo largo del tiempo con una precisión asombrosa desde su génesis en 2009.',
      whatIsContent2: 'A diferencia de otros modelos (como Stock-to-Flow), el Power Law se basa puramente en la relación matemática entre el <strong>tiempo transcurrido</strong> y el <strong>precio</strong>, sin asumir escasez, producción o factores externos.',
      formula: 'La Fórmula Matemática',
      formulaWhere: 'Donde:',
      formulaPrice: 'Precio de Bitcoin en USD',
      formulaYears: 'Años desde el génesis (3 enero 2009)',
      formulaScale: 'Coeficiente de escala',
      formulaExponent: 'Exponente de potencia',
      formulaNote: '💡 Estos valores se derivaron mediante regresión logarítmica sobre todos los datos históricos de Bitcoin desde 2009.',
      howWorks: '¿Cómo Funciona?',
      step1: '<strong>Cálculo del Tiempo:</strong> Se calcula cuántos días han pasado desde el 3 de enero de 2009 (bloque génesis) y se convierte a años.',
      step2: '<strong>Aplicación de la Fórmula:</strong> Se eleva el tiempo a la potencia 5.616 y se multiplica por 10^-1.847, obteniendo el "precio justo" o fair value.',
      step3: '<strong>Ratio de Valoración:</strong> Se compara el precio real con el modelo (Ratio = Precio Real / Precio Modelo). Si el ratio es menor que 1.0, Bitcoin está infravalorado.',
      step4: '<strong>Bandas de Soporte/Resistencia:</strong> Se calculan multiplicando el modelo por 3.0 (techo histórico) y 0.5 (piso histórico).',
      interpretation: 'Interpretación de Zonas',
      zoneGreen: 'Bitcoin INFRAVALORADO - Oportunidad de compra',
      zoneBlue: 'JUSTO - Precio cerca del fair value',
      zoneYellow: 'SOBREVALORADO - Precaución',
      zoneRed: 'TECHO HISTÓRICO - Alto riesgo de corrección',
      evidence: 'Evidencia Histórica',
      evidenceIntro: 'El modelo Power Law ha mostrado una correlación extraordinaria con el precio de Bitcoin:',
      evidenceR2: '(94%+ de correlación) en escala logarítmica',
      evidenceFloors: 'Los <strong>pisos de mercado</strong> (2011, 2015, 2018, 2022) coinciden con ratio ~0.5',
      evidenceCeilings: 'Los <strong>techos de mercado</strong> (2013, 2017, 2021) coinciden con ratio ~3.0',
      evidenceHalvings: 'El modelo se mantiene válido incluso después de <strong>4 ciclos halving</strong>',
      whyWorks: '¿Por Qué Funciona?',
      whyWorksIntro: 'Aunque nadie sabe con certeza por qué el Power Law funciona tan bien, hay varias teorías:',
      adoption: '<strong>Adopción Exponencial:</strong> Bitcoin sigue una curva de adopción similar a otras tecnologías revolucionarias (internet, smartphones)',
      network: '<strong>Efecto de Red:</strong> El valor de Bitcoin crece exponencialmente con cada nuevo usuario (Ley de Metcalfe)',
      scarcity: '<strong>Escasez Digital:</strong> La oferta limitada (21M BTC) combinada con demanda creciente genera presión alcista predecible',
      selfFulfilling: '<strong>Auto-Cumplimiento:</strong> Los inversores conocen el modelo y toman decisiones basadas en él, reforzando su validez',
      limitations: 'Limitaciones y Advertencias',
      limitMath: 'El modelo es una <strong>proyección matemática</strong>, no una garantía',
      limitBlackSwan: '<strong>Eventos cisne negro</strong> (regulación extrema, hackeos masivos, guerras) pueden invalidar el modelo',
      limitPast: 'El pasado no garantiza el futuro - Bitcoin podría entrar en <strong>fase de saturación</strong>',
      limitMacro: 'El modelo no considera <strong>factores macroeconómicos</strong> (inflación, tasas de interés, etc.)',
      howToUse: '¿Cómo Usar Este Modelo?',
      howToUseIntro: 'Esta herramienta te ayuda a:',
      useIdentify: '<strong>Identificar oportunidades:</strong> Comprar cuando ratio < 0.8',
      useRisk: '<strong>Gestionar riesgo:</strong> Reducir exposición cuando ratio > 2.0',
      usePlan: '<strong>Planificar estrategias:</strong> Usar préstamos colateralizados cuando BTC está infravalorado',
      useProject: '<strong>Proyectar escenarios:</strong> Ver dónde podría estar el precio en 6 meses, 1 año, 5 años',
      references: 'Referencias y Lecturas',
      giovanniArticles: 'Artículos de Giovanni Santostasi',
      disclaimer: '💡 Este modelo es solo educativo. Siempre haz tu propia investigación (DYOR).',
      understood: 'Entendido',
    },
    
    // Footer
    footer: {
      dataFrom: 'Datos de',
      modelBy: 'Modelo por',
      disclaimer: 'Esta herramienta es solo para fines educativos. No es asesoramiento financiero.',
    },
    
    // Settings
    settings: {
      title: 'Configuración',
      theme: 'Tema',
      themeLight: 'Claro',
      themeDark: 'Oscuro',
      testSound: 'Probar Sonido',
      logout: 'Cerrar Sesión',
    },
    
    // Auth
    auth: {
      title: 'Trader Legendario',
      tagline: 'Terminal de Trading de Alta Frecuencia',
      badge: 'Acceso Restringido',
      sessionTitle: 'Inicializar Sesión',
      sessionSubtitle: 'Ingresa tu clave de acceso única para continuar.',
      inputLabel: 'Clave de Terminal',
      button: 'Entrar al Sistema',
      error: 'Clave de acceso incorrecta. Intenta de nuevo.',
      encrypted: 'Conexión encriptada establecida (AES-256)',
      unauthorized: 'Los intentos de acceso no autorizados son registrados',
      copyright: '© 2025 Trader Legendario Sistemas Propietarios',
    },

    // Time formatting
    time: {
      ago: 'hace',
    },
  },

  en: {
    // Header
    header: {
      title: 'Legendary Trader',
      titleIntraday: 'Legendary Trader',
      subtitle: "Giovanni Santostasi's Model",
      subtitleIntraday: 'Smart Intraday Trading',
      infoAriaLabel: 'Model information',
      liveMarket: 'Live Market',
    },
    
    // Portfolio
    portfolio: {
      total: 'Total Portfolio',
      range: 'Range: $100 - $10,000,000',
      interestRate: 'Annual Interest Rate',
      interestHelp: 'Loan rate on your platform',
      estimatedCost6m: 'Estimated 6-month cost:',
    },
    
    // Timeframes
    timeframes: {
      '15d': '15 days',
      '30d': '30 days',
      '3m': '3 months',
      '1y': '1 year',
      all: 'All',
    },
    
    // Right sidebar cards
    sidebar: {
      currentPrice: 'Current Price',
      currentPriceTooltip: 'Real-time Bitcoin spot price in USD from Binance',
      fairValue: 'Fair Value (Model)',
      fairValueTooltip: 'Fair price calculated with Power Law model based on {days} days since Bitcoin genesis (Jan 3, 2009)',
      powerLawDays: 'Power Law • {days} days since genesis',
      ratio: 'Ratio (R)',
      ratioTooltip: 'Ratio = Current Price / Model Price. Ratio < 1.0 means BTC is undervalued. Ratio > 1.0 means overvalued.',
      floor: 'Floor (0.5x)',
      fair: 'Fair (1.0x)',
      ceiling: 'Ceiling (3.0x)',
      belowFairValue: '{percent}% below fair value',
      aboveFairValue: '{percent}% above fair value',
      aiRecommendation: 'AI Recommendation',
      totalScore: 'Total Score:',
      opportunity: 'Opportunity:',
      opportunityTooltip: 'Based on how undervalued BTC is vs the model. Higher score = better buying opportunity.',
      security: 'Security:',
      securityTooltip: 'Based on loan LTV. Lower LTV = higher security against liquidation.',
      riskLevel: 'Risk Level',
      usingLastValue: '⚠️ Using last known value',
      btc: 'Bitcoin (BTC)',
    },
    
    // Zones
    zones: {
      extremelyUndervalued: 'EXTREMELY UNDERVALUED',
      historicalFloor: 'HISTORICAL FLOOR',
      undervalued: 'UNDERVALUED',
      fairZone: 'FAIR VALUE',
      overvalued: 'OVERVALUED',
      historicalCeiling: 'HISTORICAL CEILING',
      extremelyOvervalued: 'EXTREMELY OVERVALUED',
    },
    
    // Main content / Risk section
    main: {
      powerLawChart: 'Power Law Chart',
      riskAndLeverage: 'Risk & Leverage',
      selectedStrategy: 'Selected Strategy',
      recommendedByRatio: '✅ Recommended based on current ratio',
      notRecommended: '⚠️ Not recommended - Analysis only',
      notRecommendedTitle: 'Strategy Not Recommended',
      longWarning: 'Bitcoin is <strong>{percent}% above fair value</strong>. Opening a LONG at this time has high correction risk. Recommended strategy is <strong>SHORT</strong>.',
      shortWarning: 'Bitcoin is <strong>near or below fair value</strong>. Opening a SHORT at this time has low profit potential. Recommended strategy is <strong>LONG</strong>.',
      
      // Cards
      collateral: 'Collateral',
      collateralTooltip: 'Amount of BTC to deposit as loan collateral. Calculated as % of portfolio based on valuation zone.',
      loan: 'Loan',
      loanTooltip: 'Loan-to-Value: percentage of collateral you can borrow. Higher LTV = higher liquidation risk.',
      additionalBtc: 'Additional BTC',
      totalExposure: 'Total Exposure',
      totalExposureTooltip: 'Your total BTC position = Collateral + BTC purchased with loan.',
      leverage: 'Leverage:',
      ofPortfolio: '% of portfolio',
      annualRate: 'Rate: {rate}% annual',
      
      // SHORT cards
      collateralShort: 'SHORT Collateral',
      collateralShortTooltip: 'USD amount to deposit as collateral for short position.',
      exposureShort: 'SHORT Exposure',
      exposureShortTooltip: 'Total value of leveraged short position.',
      profitIfDrops: 'Profit if drops to Model',
      profitIfDropsTooltip: 'Potential profit if price drops to Power Law fair value.',
      stopLoss: 'Stop Loss (Liquidation)',
      stopLossTooltip: 'If price RISES to this level, position is liquidated.',
      return: 'return',
      priceUp: 'rise',
      lev: 'Lev:',
      
      // Critical prices
      securityPrices: 'Security Prices',
      marginCall: 'Margin Call (85% LTV)',
      liquidation: 'Liquidation (91% LTV)',
      marginCallShort: 'SHORT Margin Call',
      liquidationShort: 'SHORT Liquidation',
      requiredDrop: 'Required drop',
      requiredRise: 'Required rise',
      modelFloor: 'Model Floor (0.5x)',
      modelCeiling: 'Model Ceiling (3x)',
      safetyMargin: 'Safety margin',
      upsidePotential: 'Upside potential',
      
      // Visual bar
      floor: 'Floor',
      ceiling: 'Ceiling',
      current: 'Current',
      
      // Leverage table
      leverageTable: 'Leverage Table',
      riskByLeverage: 'Impact of leverage on critical prices',
      leverageCol: 'Lev.',
      loanCol: 'Loan',
      expositionCol: 'Exposure',
      liqPriceCol: 'Liq. Price',
      changeCol: 'Change',
      riskCol: 'Risk',
      recCol: 'Rec.',
      riskLow: 'Low',
      riskMedium: 'Medium',
      riskHigh: 'High',
      riskVeryHigh: 'Very High',
      
      // Projections
      projections6m: '6-Month Projection',
      scenarios: 'Scenarios if BTC reaches model price',
      if: 'If',
      potentialValue: 'Potential value',
      interestCost: 'Interest cost',
      netGain: 'Net gain',
      roi: 'ROI on collateral',
      disclaimer: 'This projection assumes BTC reaches model fair value. Actual results may vary significantly.',
    },
    
    // Modal
    modal: {
      title: "Bitcoin's Power Law Model",
      whatIs: 'What is the Power Law Model?',
      whatIsContent1: 'The Power Law model is a mathematical equation developed by <strong>Giovanni Santostasi</strong>, a physicist and Bitcoin analyst, that describes Bitcoin\'s price growth over time with remarkable accuracy since its genesis in 2009.',
      whatIsContent2: 'Unlike other models (like Stock-to-Flow), the Power Law is based purely on the mathematical relationship between <strong>elapsed time</strong> and <strong>price</strong>, without assuming scarcity, production, or external factors.',
      formula: 'The Mathematical Formula',
      formulaWhere: 'Where:',
      formulaPrice: 'Bitcoin price in USD',
      formulaYears: 'Years since genesis (Jan 3, 2009)',
      formulaScale: 'Scale coefficient',
      formulaExponent: 'Power exponent',
      formulaNote: '💡 These values were derived through logarithmic regression on all Bitcoin historical data since 2009.',
      howWorks: 'How Does It Work?',
      step1: '<strong>Time Calculation:</strong> Calculate how many days have passed since January 3, 2009 (genesis block) and convert to years.',
      step2: '<strong>Formula Application:</strong> Raise time to power 5.616 and multiply by 10^-1.847, obtaining the "fair price" or fair value.',
      step3: '<strong>Valuation Ratio:</strong> Compare real price with model (Ratio = Real Price / Model Price). If ratio is less than 1.0, Bitcoin is undervalued.',
      step4: '<strong>Support/Resistance Bands:</strong> Calculated by multiplying model by 3.0 (historical ceiling) and 0.5 (historical floor).',
      interpretation: 'Zone Interpretation',
      zoneGreen: 'Bitcoin UNDERVALUED - Buying opportunity',
      zoneBlue: 'FAIR - Price near fair value',
      zoneYellow: 'OVERVALUED - Caution',
      zoneRed: 'HISTORICAL CEILING - High correction risk',
      evidence: 'Historical Evidence',
      evidenceIntro: 'The Power Law model has shown extraordinary correlation with Bitcoin price:',
      evidenceR2: '(94%+ correlation) on logarithmic scale',
      evidenceFloors: '<strong>Market floors</strong> (2011, 2015, 2018, 2022) coincide with ratio ~0.5',
      evidenceCeilings: '<strong>Market ceilings</strong> (2013, 2017, 2021) coincide with ratio ~3.0',
      evidenceHalvings: 'The model remains valid even after <strong>4 halving cycles</strong>',
      whyWorks: 'Why Does It Work?',
      whyWorksIntro: 'Although no one knows for sure why the Power Law works so well, there are several theories:',
      adoption: '<strong>Exponential Adoption:</strong> Bitcoin follows an adoption curve similar to other revolutionary technologies (internet, smartphones)',
      network: '<strong>Network Effect:</strong> Bitcoin\'s value grows exponentially with each new user (Metcalfe\'s Law)',
      scarcity: '<strong>Digital Scarcity:</strong> Limited supply (21M BTC) combined with growing demand creates predictable upward pressure',
      selfFulfilling: '<strong>Self-Fulfilling:</strong> Investors know the model and make decisions based on it, reinforcing its validity',
      limitations: 'Limitations and Warnings',
      limitMath: 'The model is a <strong>mathematical projection</strong>, not a guarantee',
      limitBlackSwan: '<strong>Black swan events</strong> (extreme regulation, massive hacks, wars) can invalidate the model',
      limitPast: 'Past does not guarantee future - Bitcoin could enter a <strong>saturation phase</strong>',
      limitMacro: 'The model doesn\'t consider <strong>macroeconomic factors</strong> (inflation, interest rates, etc.)',
      howToUse: 'How to Use This Model?',
      howToUseIntro: 'This tool helps you:',
      useIdentify: '<strong>Identify opportunities:</strong> Buy when ratio < 0.8',
      useRisk: '<strong>Manage risk:</strong> Reduce exposure when ratio > 2.0',
      usePlan: '<strong>Plan strategies:</strong> Use collateralized loans when BTC is undervalued',
      useProject: '<strong>Project scenarios:</strong> See where price could be in 6 months, 1 year, 5 years',
      references: 'References and Reading',
      giovanniArticles: "Giovanni Santostasi's Articles",
      disclaimer: '💡 This model is educational only. Always do your own research (DYOR).',
      understood: 'Understood',
    },
    
    // Footer
    footer: {
      dataFrom: 'Data from',
      modelBy: 'Model by',
      disclaimer: 'This tool is for educational purposes only. Not financial advice.',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      testSound: 'Test Sound',
      logout: 'Log Out',
    },
    
    // Auth
    auth: {
      title: 'Trader Legendario',
      tagline: 'High-Frequency Trading Terminal',
      badge: 'Restricted Access',
      sessionTitle: 'Initialize Session',
      sessionSubtitle: 'Enter your unique access key to continue.',
      inputLabel: 'Terminal Key',
      button: 'Enter System',
      error: 'Wrong access key. Try again.',
      encrypted: 'Encrypted connection established (AES-256)',
      unauthorized: 'Unauthorized access attempts are logged and reported',
      copyright: '© 2025 Trader Legendario Proprietary Systems',
    },

    // Time formatting
    time: {
      ago: 'ago',
    },
  },
};

export type TranslationKey = keyof typeof translations.es;
