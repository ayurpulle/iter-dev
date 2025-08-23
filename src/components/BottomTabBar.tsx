import { Home, MapIcon, Plus, MessageCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const BottomTabBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto p-2">
          <Home size={20} className="text-primary" />
        </Button>
        
        <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto p-2">
          <MapIcon size={20} className="text-muted-foreground" />
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground"
        >
          <Plus size={20} />
        </Button>
        
        <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto p-2">
          <MessageCircle size={20} className="text-muted-foreground" />
        </Button>
        
        <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto p-2">
          <Globe size={20} className="text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default BottomTabBar;