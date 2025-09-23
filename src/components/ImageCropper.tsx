import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crop, X } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImageBlob: Blob) => void;
  imageFile: File;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  isOpen,
  onClose,
  onCrop,
  imageFile
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate the displayed image dimensions
    const displayedWidth = img.offsetWidth;
    const displayedHeight = img.offsetHeight;
    
    // Set initial crop area as a square in the center
    const size = Math.min(displayedWidth, displayedHeight) * 0.8;
    const x = (displayedWidth - size) / 2;
    const y = (displayedHeight - size) / 2;
    
    setCropArea({ x, y, size });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropArea.x, y: e.clientY - cropArea.y });
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !imageRef.current) return;
    
    const img = imageRef.current;
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, img.offsetWidth - cropArea.size));
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, img.offsetHeight - cropArea.size));
    
    setCropArea(prev => ({ ...prev, x: newX, y: newY }));
  }, [isDragging, dragStart, cropArea.size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Calculate the scale factor between displayed image and natural image
    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    
    // Set canvas size to the crop area size
    canvas.width = cropArea.size * scaleX;
    canvas.height = cropArea.size * scaleY;
    
    // Create a new image element to draw from
    const sourceImg = new Image();
    sourceImg.onload = () => {
      // Draw the cropped portion
      ctx.drawImage(
        sourceImg,
        cropArea.x * scaleX, // source x
        cropArea.y * scaleY, // source y
        cropArea.size * scaleX, // source width
        cropArea.size * scaleY, // source height
        0, // destination x
        0, // destination y
        canvas.width, // destination width
        canvas.height // destination height
      );
      
      canvas.toBlob((blob) => {
        if (blob) {
          onCrop(blob);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    };
    sourceImg.src = imageUrl;
  }, [cropArea, imageUrl, onCrop, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Your Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            ref={containerRef}
            className="relative max-h-96 overflow-hidden flex justify-center"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {imageUrl && (
              <>
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-96 object-contain"
                  onLoad={handleImageLoad}
                  draggable={false}
                />
                
                {/* Crop overlay */}
                <div
                  className="absolute border-2 border-white shadow-lg cursor-move bg-white/20"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.size,
                    height: cropArea.size,
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute inset-0 border border-dashed border-white/60" />
                  <div className="absolute top-1 right-1 text-white text-xs bg-black/50 px-1 rounded">
                    <Crop className="w-3 h-3" />
                  </div>
                </div>
                
                {/* Dark overlay for non-cropped areas */}
                <div 
                  className="absolute inset-0 bg-black/50 pointer-events-none"
                  style={{
                    clipPath: `polygon(0% 0%, 0% 100%, ${cropArea.x}px 100%, ${cropArea.x}px ${cropArea.y}px, ${cropArea.x + cropArea.size}px ${cropArea.y}px, ${cropArea.x + cropArea.size}px ${cropArea.y + cropArea.size}px, ${cropArea.x}px ${cropArea.y + cropArea.size}px, ${cropArea.x}px 100%, 100% 100%, 100% 0%)`
                  }}
                />
              </>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleCrop}>
              <Crop className="w-4 h-4 mr-2" />
              Crop Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};