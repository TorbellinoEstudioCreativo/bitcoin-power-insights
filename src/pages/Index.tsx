import { Header } from "@/components/trading/Header";
import { LeftSidebar } from "@/components/trading/LeftSidebar";
import { RightSidebar } from "@/components/trading/RightSidebar";
import { MainContent } from "@/components/trading/MainContent";
import { Footer } from "@/components/trading/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <LeftSidebar />
        </div>
        
        {/* Main Content */}
        <MainContent />
        
        {/* Right Sidebar - hidden on mobile, shown on lg+ */}
        <div className="hidden xl:block">
          <RightSidebar />
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
