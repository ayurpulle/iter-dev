import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Star } from 'lucide-react';

interface SavedRecommendation {
  name: string;
  avatar?: string;
  review: string;
  visitDate?: string;
  postId?: string;
  rating?: number;
}

interface SavedRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName: string;
  recommendations?: SavedRecommendation[];
}

export const SavedRecommendationModal = ({
  isOpen,
  onClose,
  venueName,
  recommendations = []
}: SavedRecommendationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-pink-600" />
            {venueName}
          </DialogTitle>
          <DialogDescription>
            {`Recommended by ${recommendations.map(r => r.name).join(', ')} (${recommendations.length} ${recommendations.length === 1 ? 'recommendation' : 'recommendations'})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={rec.avatar} />
                <AvatarFallback className="text-xs bg-green-200 dark:bg-green-800">
                  {rec.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    {rec.name}
                  </span>
                  {rec.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {rec.rating}/5
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-green-800 dark:text-green-200 mb-2 line-clamp-3">
                  "{rec.review}"
                </p>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {rec.visitDate}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    Recommended by {rec.name}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};