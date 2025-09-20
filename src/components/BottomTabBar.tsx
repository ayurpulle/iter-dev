import React from 'react';
import { Home, Plane, PlusCircle, User, Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationBadge from './NotificationBadge';
import { Button } from '@/components/ui/button';

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3" style={{ paddingBottom: `calc(0.75rem + var(--safe-area-inset-bottom))` }}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        <Button 
          variant="ghost" 
          size="lg" 
          className="flex flex-col items-center gap-1 h-auto p-3"
          onClick={() => navigate("/")}
        >
          <Home size={30} className={location.pathname.startsWith("/") && location.pathname !== "/map" && location.pathname !== "/create" && location.pathname !== "/search" && location.pathname !== "/account" ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="lg" 
          className="flex flex-col items-center gap-1 h-auto p-3"
          onClick={() => navigate("/map")}
        >
          <Globe size={30} className={location.pathname.startsWith("/map") ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="lg" 
          className="flex flex-col items-center gap-1 h-auto p-3 relative"
          onClick={() => navigate("/create")}
        >
          <PlusCircle size={30} className={location.pathname.startsWith("/create") ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="lg" 
          className="flex flex-col items-center gap-1 h-auto p-3"
          onClick={() => navigate("/search")}
        >
          <Plane size={26} className={location.pathname.startsWith("/search") ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="lg" 
          className="flex flex-col items-center gap-1 h-auto p-3"
          onClick={() => navigate("/account")}
        >
          <User size={26} className={location.pathname.startsWith("/account") ? "text-primary" : "text-muted-foreground"} />
        </Button>
      </div>
    </div>
  );
};

export default BottomTabBar;