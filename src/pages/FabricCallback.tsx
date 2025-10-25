import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const FabricCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        console.log('Processing Fabric OAuth callback...');

        // Call edge function to exchange code for tokens
        const { data, error: callbackError } = await supabase.functions.invoke(
          'fabric-oauth-callback',
          {
            body: { code, state }
          }
        );

        if (callbackError) {
          throw callbackError;
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to connect to Fabric');
        }

        console.log('Fabric connection successful');

        // Notify parent window (if in popup)
        if (window.opener) {
          window.opener.postMessage(
            { type: 'fabric-oauth-success', data },
            window.location.origin
          );
          window.close();
        } else {
          // If not in popup, redirect to home
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Fabric OAuth callback error:', error);
        
        // Notify parent window of error (if in popup)
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'fabric-oauth-error',
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            window.location.origin
          );
          window.close();
        } else {
          // If not in popup, redirect to home with error
          navigate('/', { replace: true });
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Connecting to Fabric...</p>
    </div>
  );
};

export default FabricCallback;
