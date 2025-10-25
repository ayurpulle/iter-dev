import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useFabricConnection } from '@/hooks/useFabricConnection';

export const FabricConnectionToggle = () => {
  const { connection, isConnected, connecting, initiateConnection, disconnectFabric } = useFabricConnection();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await initiateConnection();
    } else {
      setIsDisconnecting(true);
      await disconnectFabric();
      setIsDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Fabric MCP Integration
              {isConnected && <Badge variant="default">Connected</Badge>}
            </CardTitle>
            <CardDescription>
              Connect your Fabric account to enhance itinerary generation with your saved travel recommendations and notes
            </CardDescription>
          </div>
          <Switch 
            checked={isConnected}
            onCheckedChange={handleToggle}
            disabled={connecting || isDisconnecting}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {isConnected 
              ? 'Your Fabric account is connected. We\'ll use your saved content to provide personalized itinerary suggestions.'
              : 'Enable this integration to pull in your saved travel content from Fabric when generating itineraries.'
            }
          </p>
          
          {isConnected && connection && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Connected as: {connection.fabric_user_id || 'User'}</span>
              {connection.last_synced_at && (
                <span>• Last synced: {new Date(connection.last_synced_at).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>

        {!isConnected && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={initiateConnection}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Connect to Fabric
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You'll need to authorize access to your Fabric account
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
