import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FabricRecommendation {
  title: string;
  url: string;
  content?: string;
  tags?: string[];
  source?: string;
}

export const useFabricRecommendations = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('fabric_connections')
        .select('status')
        .eq('user_id', user.id)
        .single();

      setIsConnected(data?.status === 'active');
    } catch (error) {
      console.error('Error checking Fabric connection:', error);
    }
  };

  const fetchRecommendations = async (destination: string, interests?: string[]): Promise<FabricRecommendation[]> => {
    if (!isConnected) {
      console.log('Fabric not connected, skipping recommendations fetch');
      return [];
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get Fabric connection with tokens
      const { data: connection } = await supabase
        .from('fabric_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!connection?.access_token) {
        console.log('No valid Fabric access token found');
        return [];
      }

      // Call edge function to fetch Fabric recommendations
      const { data, error } = await supabase.functions.invoke('fetch-fabric-recommendations', {
        body: { 
          destination, 
          interests,
          accessToken: connection.access_token 
        }
      });

      if (error) {
        console.error('Error fetching Fabric recommendations:', error);
        return [];
      }

      return data?.recommendations || [];
    } catch (error) {
      console.error('Error fetching Fabric recommendations:', error);
      toast({
        title: "Fabric Error",
        description: "Failed to fetch recommendations from Fabric",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    isConnected,
    loading,
    fetchRecommendations,
    checkConnection
  };
};
