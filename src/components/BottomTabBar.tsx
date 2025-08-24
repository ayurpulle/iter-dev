import { Home, MapIcon, Plus, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-center max-w-md mx-auto relative">
        <div className="flex items-center gap-8">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 h-auto p-2"
            onClick={() => navigate("/")}
          >
            <Home size={20} className={location.pathname === "/" ? "text-primary" : "text-muted-foreground"} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 h-auto p-2"
            onClick={() => navigate("/map")}
          >
            <MapIcon size={20} className={location.pathname === "/map" ? "text-primary" : "text-muted-foreground"} />
          </Button>
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground"
        >
          <Plus size={24} />
        </Button>
        
        <div className="flex items-center gap-8">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto p-2">
            <Search size={20} className="text-muted-foreground" />
          </Button>
          
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto p-2">
            <User size={20} className="text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BottomTabBar;