import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageIcon, Plus, X, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeCamera } from '@/hooks/useNativeCamera';

interface PhotoSelectorProps {
  onPhotosSelected: (photos: string[]) => void;
  maxPhotos?: number;
}

const PhotoSelector = ({ onPhotosSelected, maxPhotos = 10 }: PhotoSelectorProps) => {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const { selectFromGallery, takePhoto, loading } = useNativeCamera();

  const handleSelectFromGallery = async () => {
    const photo = await selectFromGallery();
    if (photo) {
      const newPhotos = [...selectedPhotos, photo];
      setSelectedPhotos(newPhotos);
      onPhotosSelected(newPhotos);
    }
  };

  const handleTakePhoto = async () => {
    const photo = await takePhoto();
    if (photo) {
      const newPhotos = [...selectedPhotos, photo];
      setSelectedPhotos(newPhotos);
      onPhotosSelected(newPhotos);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(newPhotos);
    onPhotosSelected(newPhotos);
  };

  const canAddMore = selectedPhotos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Select Photos</h2>
        <p className="text-muted-foreground">
          Choose up to {maxPhotos} photos from your gallery
        </p>
      </div>

      {/* Photo Grid */}
      {selectedPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {selectedPhotos.map((photo, index) => (
            <Card key={index} className="relative aspect-square overflow-hidden">
              <img
                src={photo}
                alt={`Selected ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => removePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              {index === 0 && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                  Main
                </div>
              )}
            </Card>
          ))}
          
          {/* Add More Button */}
          {canAddMore && (
            <Card 
              className={cn(
                "aspect-square flex items-center justify-center cursor-pointer border-dashed border-2 hover:bg-muted/50 transition-colors",
                loading && "opacity-50"
              )}
              onClick={handleSelectFromGallery}
            >
              <div className="text-center space-y-2">
                <Plus className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Add Photo</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Initial Selection */}
      {selectedPhotos.length === 0 && (
        <Card className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Add Photos to Your Trip</h3>
            <p className="text-sm text-muted-foreground">
              Share your travel memories with photos from your gallery
            </p>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={handleSelectFromGallery} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Accessing Gallery...' : 'Select from Gallery'}
            </Button>
            <Button 
              onClick={handleTakePhoto} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button 
              variant="ghost"
              onClick={() => onPhotosSelected([])}
              className="w-full"
            >
              Skip Photos
            </Button>
          </div>
        </Card>
      )}

      {/* Photo Counter */}
      {selectedPhotos.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {selectedPhotos.length} of {maxPhotos} photos selected
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoSelector;