import { Button } from "@/components/ui/button";
import { Bell, Send, MessageCircle } from "lucide-react";

const TopBar = () => {
  return (
    <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-3">
        </div>
        
        <h1 className="text-lg font-semibold text-foreground">ITER</h1>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bell size={18} className="text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MessageCircle size={18} className="text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Send size={18} className="text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;