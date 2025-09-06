import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Users, Hash } from 'lucide-react';
import PhotoSelector from './PhotoSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UploadPostProps {
  onBack?: () => void;
}

const UploadPost = ({ onBack }: UploadPostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'photos' | 'details'>('photos');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePhotosSelected = (photos: string[]) => {
    setSelectedPhotos(photos);
  };

  const handleNextStep = () => {
    if (selectedPhotos.length > 0) {
      setCurrentStep('details');
    }
  };

  const handlePost = async () => {
    if (!user || !caption.trim()) return;

    try {
      setIsPosting(true);

      // For now, just take the first photo as the main image
      const mainImage = selectedPhotos.length > 0 ? selectedPhotos[0] : null;

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: caption,
          image_url: mainImage,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your post has been shared!"
      });

      // Reset form and go back
      setSelectedPhotos([]);
      setCaption('');
      setLocation('');
      setTags('');
      onBack?.();

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={currentStep === 'details' ? () => setCurrentStep('photos') : onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 'details' ? 'Back' : 'Cancel'}
        </Button>
        
        <h1 className="font-semibold">
          {currentStep === 'photos' ? 'New Post' : 'Share Your Experience'}
        </h1>
        
        {currentStep === 'photos' ? (
          <Button
            size="sm"
            onClick={handleNextStep}
            disabled={selectedPhotos.length === 0}
          >
            Next
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handlePost}
            disabled={!caption.trim() || isPosting}
          >
            {isPosting ? 'Sharing...' : 'Share'}
          </Button>
        )}
      </div>

      <div className="p-4">
        {currentStep === 'photos' ? (
          <PhotoSelector 
            onPhotosSelected={handlePhotosSelected}
            maxPhotos={10}
          />
        ) : (
          <div className="space-y-6">
            {/* Selected Photos Preview */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedPhotos.map((photo, index) => (
                <div key={index} className="flex-shrink-0">
                  <img
                    src={photo}
                    alt={`Selected ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption *</Label>
              <Textarea
                id="caption"
                placeholder="Write a caption about your experience..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-24 resize-none"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tags"
                  placeholder="Add tags (separated by commas)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Example: travel, beach, sunset, vacation
              </p>
            </div>

            {/* Post Preview */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Your Name</p>
                  {location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location}
                    </p>
                  )}
                </div>
              </div>
              
              {caption && (
                <p className="text-sm">{caption}</p>
              )}
              
              {tags && (
                <div className="flex flex-wrap gap-1">
                  {tags.split(',').map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-muted px-2 py-1 rounded-full"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPost;