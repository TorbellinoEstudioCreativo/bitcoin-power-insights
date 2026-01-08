import { useState } from "react";
import { Header } from "@/components/trading/Header";
import { LeftSidebar } from "@/components/trading/LeftSidebar";
import { RightSidebar } from "@/components/trading/RightSidebar";
import { MainContent } from "@/components/trading/MainContent";
import { Footer } from "@/components/trading/Footer";
import { PortfolioInput } from "@/components/trading/PortfolioInput";
import { usePowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { useAlerts } from "@/hooks/useAlerts";
import { BTC_PRICE_FALLBACK } from "@/lib/constants";

const Index = () => {
  const [portfolioValue, setPortfolioValue] = useState(15000);
  const debouncedPortfolioValue = useDebouncedValue(portfolioValue, 300);
  
  // Fetch real-time BTC price from CoinGecko
  const { data: priceData, isError: isPriceError, dataUpdatedAt } = useBitcoinPrice();
  const btcPrice = priceData?.price ?? BTC_PRICE_FALLBACK;
  
  const analysis = usePowerLawAnalysis(debouncedPortfolioValue, btcPrice);
  
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
      <PortfolioInput value={portfolioValue} onChange={setPortfolioValue} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - hidden on mobile/tablet */}
        <div className="hidden lg:block">
          <LeftSidebar />
        </div>
        
        {/* Main Content */}
        <MainContent analysis={analysis} btcPrice={btcPrice} />
        
        {/* Right Sidebar - hidden on mobile/tablet, shown on xl+ */}
        <div className="hidden xl:block">
          <RightSidebar 
            analysis={analysis} 
            priceData={priceData}
            isPriceError={isPriceError}
            dataUpdatedAt={dataUpdatedAt}
          />
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
