import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, RefreshCw, MessageSquare } from 'lucide-react';
import { IterEditDialog } from './IterEditDialog';

interface ItineraryUpdateDropdownProps {
  iterData: {
    id: string;
    title: string;
    destination: string;
    itinerary_content: string;
    is_owner?: boolean;
    can_edit?: boolean;
    start_date?: string | null;
    end_date?: string | null;
    budget?: number | null;
    interests?: string[] | null;
  };
  hasChanges: boolean;
  onUpdate: () => void;
  onIterUpdated?: (newContent: string, newDestination?: string) => void;
  className?: string;
}

export const ItineraryUpdateDropdown = ({
  iterData,
  hasChanges,
  onUpdate,
  onIterUpdated,
  className
}: ItineraryUpdateDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const canEdit = iterData.is_owner || iterData.can_edit;
  
  console.log('ItineraryUpdateDropdown:', {
    hasChanges,
    canEdit,
    is_owner: iterData.is_owner,
    can_edit: iterData.can_edit
  });

  if (!canEdit) {
    return null;
  }

  // If there are no changes and we can edit, show the dropdown
  // If there are changes, show the Update button prominently
  if (hasChanges) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button onClick={() => {
          console.log('Update button clicked in dropdown');
          onUpdate();
        }} size="sm" className="flex items-center gap-1 px-3 py-1 h-8 text-xs">
          <RefreshCw className="h-3 w-3" />
          Update
        </Button>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1 px-2 py-1 h-8 text-xs">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <div className="w-full">
                <IterEditDialog 
                  iterData={iterData} 
                  onIterUpdated={onIterUpdated}
                />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={() => {
          console.log('Update with Changes button clicked');
          onUpdate();
        }}
        variant="outline" 
        size="sm" 
        className={`flex items-center gap-1 px-3 py-1 h-8 text-xs ${className}`}
      >
        <RefreshCw className="h-3 w-3" />
        Update with Changes
      </Button>
      <IterEditDialog 
        iterData={iterData} 
        onIterUpdated={onIterUpdated}
      />
    </div>
  );
};