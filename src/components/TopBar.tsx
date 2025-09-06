import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import NotificationBadge from "./NotificationBadge";

const TopBar = () => {
  const { signOut } = useAuth();
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
    <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-3">
        </div>
        
        <h1 className="text-lg font-semibold text-foreground">ITER</h1>
        
        <div className="flex items-center gap-3">
          <NotificationBadge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => navigate('/notifications')}
            >
              <Bell size={18} className="text-muted-foreground" />
            </Button>
          </NotificationBadge>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => navigate('/messages')}
          >
            <MessageCircle size={18} className="text-muted-foreground" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => navigate('/global-search')}
          >
            <Search size={18} className="text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;