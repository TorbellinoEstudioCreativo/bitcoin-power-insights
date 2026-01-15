import { useState, useEffect } from "react";
import { Header } from "@/components/trading/Header";
import { LeftSidebar } from "@/components/trading/LeftSidebar";
import { RightSidebar } from "@/components/trading/RightSidebar";
import { MainContent } from "@/components/trading/MainContent";
import { Footer } from "@/components/trading/Footer";
import { PortfolioInput } from "@/components/trading/PortfolioInput";
import { TradingTabs } from "@/components/layout/TradingTabs";
import { IntradayView } from "@/pages/IntradayView";
import { usePowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { useAlerts } from "@/hooks/useAlerts";
import { BTC_PRICE_FALLBACK } from "@/lib/constants";

const Index = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'powerlaw' | 'intraday'>('powerlaw');
  
  // Portfolio value state with localStorage
  const [portfolioValue, setPortfolioValue] = useState(() => {
    const saved = localStorage.getItem('portfolioValue');
    return saved ? parseFloat(saved) : 10000;
  });

  // Interest rate state with localStorage
  const [interestRate, setInterestRate] = useState(() => {
    const saved = localStorage.getItem('interestRate');
    return saved ? parseFloat(saved) : 5;
  });

  // Persist portfolio value
  useEffect(() => {
    localStorage.setItem('portfolioValue', portfolioValue.toString());
  }, [portfolioValue]);

  // Persist interest rate
  useEffect(() => {
    localStorage.setItem('interestRate', interestRate.toString());
  }, [interestRate]);

  const debouncedPortfolioValue = useDebouncedValue(portfolioValue, 300);
  const debouncedInterestRate = useDebouncedValue(interestRate, 300);
  
  // Fetch real-time BTC price from CoinGecko
  const { data: priceData, isError: isPriceError, dataUpdatedAt } = useBitcoinPrice();
  const btcPrice = priceData?.price ?? BTC_PRICE_FALLBACK;
  
  const analysis = usePowerLawAnalysis(debouncedPortfolioValue, btcPrice, debouncedInterestRate / 100);
  
  // Alerts system - monitors btcPrice for triggered alerts
  const {
    alerts,
    activeAlertsCount,
    canAddMore,
    maxAlerts,
    addAlert,
    toggleAlert,
    deleteAlert,
    resetAlert,
  } = useAlerts(btcPrice);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        alerts={alerts}
        activeAlertsCount={activeAlertsCount}
        canAddMore={canAddMore}
        maxAlerts={maxAlerts}
        currentPrice={btcPrice}
        onAddAlert={addAlert}
        onToggleAlert={toggleAlert}
        onDeleteAlert={deleteAlert}
        onResetAlert={resetAlert}
      />
      <PortfolioInput 
        value={portfolioValue} 
        onChange={setPortfolioValue}
        interestRate={interestRate}
        onInterestRateChange={setInterestRate}
        estimatedCost6m={analysis.costoIntereses6m}
      />
      
      <TradingTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'powerlaw' ? (
          <>
            {/* Left Sidebar - hidden on mobile/tablet */}
            <div className="hidden lg:block">
              <LeftSidebar />
            </div>
            
            {/* Main Content */}
            <MainContent analysis={analysis} btcPrice={btcPrice} interestRate={interestRate} />
            
            {/* Right Sidebar - hidden on mobile/tablet, shown on xl+ */}
            <div className="hidden xl:block">
              <RightSidebar 
                analysis={analysis} 
                priceData={priceData}
                isPriceError={isPriceError}
                dataUpdatedAt={dataUpdatedAt}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-auto">
            <IntradayView />
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
