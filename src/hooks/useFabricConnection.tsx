import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FabricConnection {
  id: string;
  status: 'active' | 'expired' | 'disconnected';
  connected_at: string;
  last_synced_at: string | null;
  fabric_user_id: string | null;
}

export const useFabricConnection = () => {
  const [connection, setConnection] = useState<FabricConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  // Fetch existing connection
  useEffect(() => {
    fetchConnection();
  }, []);

  const fetchConnection = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('fabric_connections')
        .select('id, status, connected_at, last_synced_at, fabric_user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Fabric connection:', error);
        throw error;
      }

      setConnection(data as FabricConnection | null);
    } catch (error) {
      console.error('Error in fetchConnection:', error);
      toast({
        title: "Error",
        description: "Failed to check Fabric connection status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateConnection = async () => {
    try {
      setConnecting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // TODO: Replace with actual Fabric OAuth URL once provided by onFabric
      const fabricClientId = 'YOUR_FABRIC_CLIENT_ID'; // This should come from environment
      const redirectUri = `${window.location.origin}/fabric-callback`;
      const state = user.id; // Pass user ID for callback verification
      
      const fabricAuthUrl = `https://auth.onfabric.com/authorize?` +
        `client_id=${fabricClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `state=${state}&` +
        `scope=digital_self journeys`;

      // Open OAuth flow in popup
      const popup = window.open(
        fabricAuthUrl,
        'Fabric OAuth',
        'width=600,height=700,scrollbars=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'fabric-oauth-success') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          // Fetch updated connection
          await fetchConnection();
          
          toast({
            title: "Success",
            description: "Successfully connected to Fabric",
          });
          
          setConnecting(false);
        } else if (event.data.type === 'fabric-oauth-error') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect to Fabric",
            variant: "destructive"
          });
          
          setConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (popup && !popup.closed) {
          popup.close();
          setConnecting(false);
          toast({
            title: "Timeout",
            description: "Connection attempt timed out",
            variant: "destructive"
          });
        }
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error initiating Fabric connection:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate connection",
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  const disconnectFabric = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('fabric_connections')
        .update({ status: 'disconnected' })
        .eq('user_id', user.id);

      if (error) throw error;

      setConnection(null);
      
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Fabric",
      });

    } catch (error) {
      console.error('Error disconnecting from Fabric:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from Fabric",
        variant: "destructive"
      });
    }
  };

  const isConnected = connection?.status === 'active';

  return {
    connection,
    isConnected,
    loading,
    connecting,
    initiateConnection,
    disconnectFabric,
    refetch: fetchConnection,
  };
};
