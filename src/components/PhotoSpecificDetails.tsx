import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users } from 'lucide-react';

interface PhotoDetail {
  caption?: string;
  budget?: string;
  tagged_friends?: string[];
}

interface PhotoSpecificDetailsProps {
  photo: string;
  details?: PhotoDetail;
  photoIndex: number;
  tripTitle?: string;
}

const PhotoSpecificDetails: React.FC<PhotoSpecificDetailsProps> = ({ 
  photo, 
  details, 
  photoIndex,
  tripTitle 
}) => {
  const getBudgetLabel = (budget: string): string => {
    const labels = {
      '$': 'Budget-friendly',
      '$$': 'Moderate', 
      '$$$': 'Expensive',
      '$$$$': 'Luxury',
      '$$$$$': 'Ultra-luxury'
    };
    return labels[budget as keyof typeof labels] || '';
  };

  return (
    <div className="space-y-3">
      {tripTitle && (
        <h3 className="font-semibold text-lg">{tripTitle}</h3>
      )}
      
      <div className="flex justify-between items-start">
        <span className="text-xs text-muted-foreground">Photo {photoIndex + 1}</span>
      </div>
      
      {details?.caption ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{details.caption}</p>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed italic">No caption added for this photo</p>
      )}
      
      {(details?.budget || details?.tagged_friends?.length) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {details?.budget && (
            <Badge variant="secondary">
              <DollarSign size={12} className="mr-1" />
              {details.budget}
              <span className="ml-1 text-muted-foreground">
                ({getBudgetLabel(details.budget)})
              </span>
            </Badge>
          )}
          
          {details?.tagged_friends?.length > 0 && (
            <Badge variant="outline">
              <Users size={12} className="mr-1" />
              with {details.tagged_friends.join(', ')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoSpecificDetails;