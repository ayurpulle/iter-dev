import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ChevronLeft, Globe, MapPin, Camera, Users, Eye, EyeOff, Loader2, Check } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const availableInterests = [
    "Adventure", "Culture", "Food", "Nature", "Photography", "History",
    "Beaches", "Mountains", "Cities", "Wildlife", "Art", "Music"
  ];

  const steps = [
    {
      title: "Welcome to Iter",
      subtitle: "Your travel companion awaits",
      content: "intro"
    },
    {
      title: "Features Overview",
      subtitle: "Discover what you can do",
      content: "features"
    },
    {
      title: "Complete Your Profile",
      subtitle: "Tell us about yourself",
      content: "profile"
    }
  ];

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please provide both email and password.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "Welcome to Iter!",
      });
      
      setCurrentStep(currentStep + 1);
    } catch (error: any) {
      toast({
        title: "Signup Error",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your name, email, and password.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // First, create the account
      const redirectUrl = `${window.location.origin}/`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (signUpError) throw signUpError;

      // If signup successful, create the profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: data.user.id,
            name: name.trim(),
            bio: bio.trim() || null,
            interests: interests.length > 0 ? interests : null,
          });

        if (profileError) throw profileError;
      }

      toast({
        title: "Welcome to Iter!",
        description: "Your account and profile are now set up!",
      });
      
      onComplete();
    } catch (error: any) {
      toast({
        title: "Setup Error",
        description: error.message || "Failed to create account and profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.content) {
      case "intro":
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
              <Globe className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground">Iter</h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Share your travel adventures, discover new destinations, and connect with fellow explorers around the world.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Camera className="w-4 h-4 text-primary" />
                Share photos
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Track travels
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 text-primary" />
                Connect with travelers
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4 text-primary" />
                Plan itineraries
              </div>
            </div>
          </div>
        );
        
      case "features":
        return (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Share Your Journey</h3>
                  <p className="text-sm text-muted-foreground">Post photos and stories from your travels to inspire others.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Interactive Map</h3>
                  <p className="text-sm text-muted-foreground">Visualize your travels and discover new destinations on our interactive world map.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Trip Planning</h3>
                  <p className="text-sm text-muted-foreground">Get personalized itineraries created by AI based on your preferences.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Travel Community</h3>
                  <p className="text-sm text-muted-foreground">Connect with like-minded travelers and share recommendations.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case "profile":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Complete Your Profile</h2>
              <p className="text-sm text-muted-foreground mt-1">Help other travelers get to know you</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="How should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us a bit about yourself and your travel style..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Travel Interests (Optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableInterests.map((interest) => (
                    <Button
                      key={interest}
                      type="button"
                      variant={interests.includes(interest) ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleInterest(interest)}
                    >
                      {interests.includes(interest) && <Check className="w-3 h-3 mr-1" />}
                      {interest}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const canGoNext = () => {
    switch (steps[currentStep].content) {
      case "profile":
        return name.trim().length > 0 && email.trim().length > 0 && password.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    const step = steps[currentStep];
    
    if (step.content === "profile") {
      handleProfileSetup();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          
          <CardTitle className="text-xl">
            {steps[currentStep].title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].subtitle}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStepContent()}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={!canGoNext() || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentStep === steps.length - 1 ? (
                "Complete Setup"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFlow;