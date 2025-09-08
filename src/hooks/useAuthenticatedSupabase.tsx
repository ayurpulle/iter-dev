import { supabaseManager } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useAuthenticatedSupabase = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const executeQuery = async <T,>(
    operation: (client: any) => Promise<{ data: T | null; error: any }>
  ): Promise<T | null> => {
    try {
      // Get authenticated client
      const client = await supabaseManager.getAuthenticatedClient();
      
      // Execute the operation
      const { data, error } = await operation(client);
      
      if (error) {
        // Handle specific auth errors
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.code === '42501') {
          // Token expired, invalid, or RLS violation
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive"
          });
          navigate('/auth');
          return null;
        }
        
        throw error;
      }
      
      return data;
    } catch (err: any) {
      console.error('Database operation failed:', err);
      
      if (err.message?.includes('Authentication required')) {
        navigate('/auth');
      } else {
        toast({
          title: "Operation Failed",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
      
      return null;
    }
  };

  return { executeQuery };
};