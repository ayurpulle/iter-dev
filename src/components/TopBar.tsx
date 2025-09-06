import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import NotificationBadge from "./NotificationBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import GlobalSearch from "./GlobalSearch";

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
            onClick={() => navigate('/chat')}
          >
            <Mail size={18} className="text-muted-foreground" />
          </Button>
          
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Search size={18} className="text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-hidden p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <DialogTitle>Search</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X size={16} />
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <GlobalSearch onClose={() => setSearchOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default TopBar;