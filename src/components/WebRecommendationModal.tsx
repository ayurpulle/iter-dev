import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebRecommendation {
  name: string;
  source: string;
  url: string;
}

interface WebRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName: string;
  recommendations: WebRecommendation[];
}

export const WebRecommendationModal = ({
  isOpen,
  onClose,
  venueName,
  recommendations
}: WebRecommendationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {venueName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This venue was recommended based on online research and reviews ({recommendations.length} source{recommendations.length > 1 ? 's' : ''})
          </p>
          
          {recommendations.map((rec, index) => (
            <div key={index} className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{rec.source}</span>
                    <Badge variant="secondary" className="text-xs">
                      Web Research
                    </Badge>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => window.open(rec.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Source
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};