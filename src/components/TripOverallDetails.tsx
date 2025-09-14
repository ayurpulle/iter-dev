import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, DollarSign } from 'lucide-react';

interface TripOverallDetailsProps {
  trip: {
    title?: string;
    overall_caption?: string;
    overall_budget?: string;
    duration?: string;
    companions?: string;
    cost?: string; // fallback for existing trips
  };
}

const TripOverallDetails: React.FC<TripOverallDetailsProps> = ({ trip }) => {
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

  // Use overall_budget if available, fallback to cost
  const budget = trip.overall_budget || trip.cost;

  return (
    <div className="space-y-3">
      {trip.title && (
        <h3 className="font-semibold text-lg">{trip.title}</h3>
      )}
      
      {trip.overall_caption && (
        <p className="text-sm text-muted-foreground">{trip.overall_caption}</p>
      )}
      
      <div className="flex flex-wrap gap-3 text-xs">
        {budget && (
          <Badge variant="outline">
            <DollarSign size={12} className="mr-1" />
            {budget} Overall
          </Badge>
        )}
        
        {trip.duration && (
          <Badge variant="outline">
            <Clock size={12} className="mr-1" />
            {trip.duration}
          </Badge>
        )}
        
        {trip.companions && (
          <Badge variant="outline">
            <Users size={12} className="mr-1" />
            {trip.companions}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default TripOverallDetails;