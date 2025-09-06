import React from 'react';
import { Home, Search, PlusCircle, Bell, User, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationBadge from './NotificationBadge';
import { Button } from '@/components/ui/button';

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-between max-w-md mx-auto">
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
          onClick={() => navigate("/search")}
        >
          <Search size={20} className={location.pathname === "/search" ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center gap-1 h-auto p-2 relative"
          onClick={() => navigate("/create")}
        >
          <PlusCircle size={24} className={location.pathname === "/create" ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center gap-1 h-auto p-2"
          onClick={() => navigate("/messages")}
        >
          <MessageCircle size={20} className={location.pathname === "/messages" ? "text-primary" : "text-muted-foreground"} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center gap-1 h-auto p-2 relative"
          onClick={() => navigate("/notifications")}
        >
          <NotificationBadge>
            <Bell size={20} className={location.pathname === "/notifications" ? "text-primary" : "text-muted-foreground"} />
          </NotificationBadge>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center gap-1 h-auto p-2"
          onClick={() => navigate("/account")}
        >
          <User size={20} className={location.pathname === "/account" ? "text-primary" : "text-muted-foreground"} />
        </Button>
      </div>
    </div>
  );
};

export default BottomTabBar;