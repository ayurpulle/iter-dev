import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
  flaggedCategories?: string[];
  severity?: 'low' | 'medium' | 'high';
}

export const useContentModeration = () => {
  const { toast } = useToast();

  const moderateContent = async (
    content: string, 
    contentType: 'post' | 'comment' | 'bio' | 'message' = 'post'
  ): Promise<ModerationResult> => {
    try {
      console.log(`Moderating ${contentType} content...`);
      
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { content, contentType }
      });

      if (error) {
        console.error('Moderation error:', error);
        // If moderation fails, allow content but log the error
        return { isAppropriate: true };
      }

      const result = data as ModerationResult;
      console.log('Moderation result:', result);

      if (!result.isAppropriate) {
        const message = result.reason || 'Content violates community guidelines';
        toast({
          title: "Content Not Allowed",
          description: message,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('Content moderation error:', error);
      // If moderation fails, allow content to prevent blocking legitimate users
      return { isAppropriate: true };
    }
  };

  return { moderateContent };
};