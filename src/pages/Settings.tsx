import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, Eye, Bell, Lock, HelpCircle, LogOut, Trash2, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FabricConnectionToggle } from "@/components/FabricConnectionToggle";
import { ImportAyurDataButton } from "@/components/ImportAyurDataButton";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  // Settings state
  const [isPublicAccount, setIsPublicAccount] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowTagging, setAllowTagging] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [likesNotifications, setLikesNotifications] = useState(true);
  const [commentsNotifications, setCommentsNotifications] = useState(true);
  const [followersNotifications, setFollowersNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user settings from profile
  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_public')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setIsPublicAccount(profile.is_public || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Update profile with privacy settings
      const { error } = await supabase
        .from('profiles')
        .update({
          is_public: isPublicAccount,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving settings:', error);
        toast({
          title: "Error",
          description: "Failed to save settings",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Settings saved",
        description: isPublicAccount 
          ? "Your account is now public - friend requests will be auto-accepted"
          : "Your account is now private - you'll need to approve friend requests",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b" style={{ paddingTop: `calc(1rem + var(--safe-area-inset-top))` }}>
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Public Account</p>
                <p className="text-xs text-muted-foreground">
                  Auto-accept friend requests and make posts public
                </p>
              </div>
              <Switch
                checked={isPublicAccount}
                onCheckedChange={setIsPublicAccount}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Show Online Status</p>
                <p className="text-xs text-muted-foreground">
                  Let others see when you're active
                </p>
              </div>
              <Switch
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Allow Tagging</p>
                <p className="text-xs text-muted-foreground">
                  Let others tag you in posts
                </p>
              </div>
              <Switch
                checked={allowTagging}
                onCheckedChange={setAllowTagging}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={20} />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications on your device
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Likes</p>
                <p className="text-xs text-muted-foreground">
                  When someone likes your posts
                </p>
              </div>
              <Switch
                checked={likesNotifications}
                onCheckedChange={setLikesNotifications}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Comments</p>
                <p className="text-xs text-muted-foreground">
                  When someone comments on your posts
                </p>
              </div>
              <Switch
                checked={commentsNotifications}
                onCheckedChange={setCommentsNotifications}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">New Followers</p>
                <p className="text-xs text-muted-foreground">
                  When someone follows you
                </p>
              </div>
              <Switch
                checked={followersNotifications}
                onCheckedChange={setFollowersNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock size={20} />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Switch
                checked={twoFactorAuth}
                onCheckedChange={setTwoFactorAuth}
              />
            </div>
            
            <Separator />
            
            <Button variant="outline" className="w-full justify-start">
              <Lock size={16} className="mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 size={20} />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FabricConnectionToggle />
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle size={20} />
              Support & Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ImportAyurDataButton />
            
            <Separator />
            
            <Button variant="outline" className="w-full justify-start">
              <HelpCircle size={16} className="mr-2" />
              Help Center
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Eye size={16} className="mr-2" />
              Privacy Policy
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Shield size={16} className="mr-2" />
              Terms of Service
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
            
            <Button variant="outline" className="w-full justify-start text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 size={16} className="mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;