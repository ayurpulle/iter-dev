import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import NotificationBadge from "./NotificationBadge";
import { Logo } from "./Logo";

const TopBar = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-4 py-0.5 rounded-b-xl shadow-sm" style={{ paddingTop: `calc(1rem + var(--safe-area-inset-top))` }}>
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="lg" onClick={() => navigate('/')} />
        
        <div className="flex items-center gap-1">
          <NotificationBadge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 rounded hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              onClick={() => navigate('/notifications')}
            >
              <Bell size={18} className="text-primary" />
            </Button>
          </NotificationBadge>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 rounded hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            onClick={() => navigate('/messages')}
          >
            <MessageCircle size={18} className="text-primary" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 rounded hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            onClick={() => navigate('/global-search')}
          >
            <Search size={18} className="text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;