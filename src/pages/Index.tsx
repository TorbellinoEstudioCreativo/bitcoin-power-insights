import { useState } from "react";
import { Header } from "@/components/trading/Header";
import { LeftSidebar } from "@/components/trading/LeftSidebar";
import { RightSidebar } from "@/components/trading/RightSidebar";
import { MainContent } from "@/components/trading/MainContent";
import { Footer } from "@/components/trading/Footer";
import { PortfolioInput } from "@/components/trading/PortfolioInput";
import { usePowerLawAnalysis } from "@/hooks/usePowerLawAnalysis";

const Index = () => {
  const [portfolioValue, setPortfolioValue] = useState(15000);
  const analysis = usePowerLawAnalysis(portfolioValue);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <PortfolioInput value={portfolioValue} onChange={setPortfolioValue} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <LeftSidebar />
        </div>
        
        {/* Main Content */}
        <MainContent analysis={analysis} />
        
        {/* Right Sidebar - hidden on mobile, shown on lg+ */}
        <div className="hidden xl:block">
          <RightSidebar analysis={analysis} />
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
