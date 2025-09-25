import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useItineraryEditContext } from './ItineraryEditContext';

interface IterEditDialogProps {
  iterData: {
    id: string;
    title: string;
    destination: string;
    itinerary_content: string;
    is_owner?: boolean;
    can_edit?: boolean;
  };
  onIterUpdated?: (newContent: string, newDestination?: string) => void;
}

export const IterEditDialog = ({ iterData, onIterUpdated }: IterEditDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editRequest, setEditRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [permissions, setPermissions] = useState({ canEdit: false, isOwner: false });
  const { toast } = useToast();
  const { addMessage, getConversation } = useItineraryEditContext();
  
  // Get conversation from context
  const conversation = getConversation(iterData.id);

  const extractDateChanges = (editRequest: string) => {
    const lowerRequest = editRequest.toLowerCase();
    let dateAdjustment = 0;
    
    // Look for duration changes
    if (lowerRequest.includes('week longer') || lowerRequest.includes('add a week') || lowerRequest.includes('extend by a week')) {
      dateAdjustment = 7;
    } else if (lowerRequest.includes('two weeks longer') || lowerRequest.includes('add two weeks')) {
      dateAdjustment = 14;
    } else if (lowerRequest.includes('day longer') || lowerRequest.includes('add a day') || lowerRequest.includes('extend by a day')) {
      dateAdjustment = 1;
    } else if (lowerRequest.includes('week shorter') || lowerRequest.includes('remove a week') || lowerRequest.includes('reduce by a week')) {
      dateAdjustment = -7;
    } else if (lowerRequest.includes('day shorter') || lowerRequest.includes('remove a day') || lowerRequest.includes('reduce by a day')) {
      dateAdjustment = -1;
    }
    
    return dateAdjustment;
  };

  const handleSendRequest = async () => {
    if (!editRequest.trim()) return;

    setIsProcessing(true);
    const userMessage = editRequest.trim();
    setEditRequest('');
    
    // Add user message to conversation
    const userMsgObj = { role: 'user' as const, content: userMessage };
    addMessage(iterData.id, userMsgObj);
    const newConversation = [...conversation, userMsgObj];

    try {
      // Check for date changes in the request
      const dateAdjustment = extractDateChanges(userMessage);
      
      // Ensure all data is properly serializable
      const serializedConversation = newConversation.map(msg => ({
        role: msg.role,
        content: String(msg.content)
      }));

      console.log('Sending edit request with data:', {
        itineraryContent: iterData.itinerary_content?.substring(0, 100) + '...',
        editRequest: userMessage,
        destination: iterData.destination,
        conversationHistoryLength: serializedConversation.length,
        budget: typeof (iterData as any)?.budget === 'number' ? (iterData as any).budget : parseInt(String((iterData as any)?.budget)) || 3,
        dateAdjustment
      });

      const { data, error } = await supabase.functions.invoke('edit-itinerary', {
        body: {
          itineraryContent: String(iterData.itinerary_content || ''),
          editRequest: String(userMessage),
          destination: String(iterData.destination || ''),
          conversationHistory: serializedConversation,
          budget: typeof (iterData as any)?.budget === 'number' ? (iterData as any).budget : parseInt(String((iterData as any)?.budget)) || 3,
          interests: String((iterData as any)?.interests?.join?.(', ') || ''),
          travelStyle: String((iterData as any)?.interests?.join?.(', ') || ''),
          dateAdjustment
        }
      });

      if (error) {
        console.error('Error editing itinerary:', error);
        toast({
          title: "Edit Failed",
          description: error.message || "Failed to edit itinerary. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Add assistant response to conversation
      const assistantMsgObj = { role: 'assistant' as const, content: data.response };
      addMessage(iterData.id, assistantMsgObj);

      // The content is already saved by the edge function, just update the UI
      if (data.saved && data.updatedItinerary) {
        console.log('Itinerary was saved by edge function, updating UI');
        
        onIterUpdated?.(data.updatedItinerary, data.newDestination);
        
        // Refresh the saved itineraries list
        window.dispatchEvent(new CustomEvent('refreshItineraries'));
        
        toast({
          title: "Iter Updated & Saved!",
          description: data.newDestination 
            ? `Your itinerary has been updated and destination changed to ${data.newDestination}.`
            : "Your itinerary has been updated and saved successfully.",
        });
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Edit Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRequest();
    }
  };

  // Check permissions after data is loaded (fix race condition)
  useEffect(() => {
    if (iterData && iterData.id) {
      const canEdit = Boolean(iterData.is_owner || iterData.can_edit);
      const isOwner = Boolean(iterData.is_owner);
      
      setPermissions({ canEdit, isOwner });
      setIsDataLoaded(true);
      
      console.log('IterEditDialog permissions loaded:', { canEdit, isOwner, iterData: iterData.id });
    }
  }, [iterData]);

  // Don't render until data is loaded
  if (!isDataLoaded) {
    return null; // Or a loading spinner if needed
  }

  // Only show if user has permissions
  if (!permissions.canEdit) {
    console.log('Edit dialog hidden - no edit permissions');
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Itinerary with AI</DialogTitle>
          <DialogDescription>
            Chat with AI to modify your {iterData.destination} itinerary. Describe what changes you'd like to make.
          </DialogDescription>
        </DialogHeader>
        
        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
          {conversation.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation to edit your itinerary</p>
              <p className="text-sm mt-2">Examples: "Add more food recommendations" or "Make day 2 more relaxing"</p>
            </div>
          ) : (
            conversation.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-background border'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="bg-background border p-3 rounded-lg max-w-[80%]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={editRequest}
            onChange={(e) => setEditRequest(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the changes you want to make..."
            className="flex-1 min-h-[80px] resize-none"
            disabled={isProcessing}
          />
          <Button 
            onClick={handleSendRequest} 
            disabled={!editRequest.trim() || isProcessing}
            className="self-end"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};