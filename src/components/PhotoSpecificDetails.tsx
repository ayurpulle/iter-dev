import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, MapPin } from 'lucide-react';

interface PhotoDetail {
  caption?: string;
  budget?: string;
  tagged_friends?: string[];
  location?: string;
  tags?: string[];
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
      
      {details?.location && (
        <div className="flex items-center gap-1">
          <MapPin size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{details.location}</span>
        </div>
      )}
      
      {details?.caption ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{details.caption}</p>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed italic">No caption added for this photo</p>
      )}
      
      {details?.tags && details.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs mb-3">
          {details.tags.map((tag, index) => (
            <Badge key={index} variant="default" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {(details?.budget && details.budget.length > 0) || (details?.tagged_friends?.length > 0) ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {details?.budget && details.budget.length > 0 && (
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
      ) : null}
    </div>
  );
};

export default PhotoSpecificDetails;