import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import OnboardingFlow from "./OnboardingFlow";
import { Loader2 } from "lucide-react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const { user, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || authLoading) {
        setCheckingProfile(false);
        return;
      }

      try {
        // Check if user has completed their profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('name, bio')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking profile:', error);
          setCheckingProfile(false);
          return;
        }

        // Show onboarding if profile doesn't exist or name is missing
        const needsOnboarding = !profile || !profile.name?.trim();
        setShowOnboarding(needsOnboarding);
      } catch (error) {
        console.error('Error in profile check:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [user, authLoading]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Show loading while checking authentication and profile
  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if user needs to complete setup
  if (user && showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Show normal app content
  return <>{children}</>;
};

export default OnboardingWrapper;