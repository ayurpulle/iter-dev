import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const usePostManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete posts",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully"
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const updatePost = useCallback(async (
    postId: string, 
    updates: { content?: string; is_private?: boolean }
  ) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to edit posts",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create update object without touching created_at or updated_at
      const updateData = {
        ...updates,
        // Only include fields we want to update, preserving original timestamps
      };
      
      const { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post updated successfully"
      });

      return data;
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const togglePostPrivacy = useCallback(async (postId: string, isPrivate: boolean) => {
    return updatePost(postId, { is_private: isPrivate });
  }, [updatePost]);

  return {
    deletePost,
    updatePost,
    togglePostPrivacy,
    loading
  };
};