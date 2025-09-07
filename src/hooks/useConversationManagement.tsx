import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useConversationManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete conversations",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Conversation deleted successfully"
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return {
    deleteConversation,
    loading
  };
};