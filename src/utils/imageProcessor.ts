import { useState, useEffect } from 'react';

export interface ProcessedImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export const STANDARD_TRIP_CARD_DIMENSIONS = {
  width: 400,
  height: 256, // This matches your map height (h-64)
  aspectRatio: 400 / 256 // ~1.56:1
};

export const processImageForTripCard = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas to standard dimensions
        canvas.width = STANDARD_TRIP_CARD_DIMENSIONS.width;
        canvas.height = STANDARD_TRIP_CARD_DIMENSIONS.height;

        // Calculate how to fit the image while maintaining aspect ratio
        const imgAspectRatio = img.width / img.height;
        const targetAspectRatio = STANDARD_TRIP_CARD_DIMENSIONS.aspectRatio;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspectRatio > targetAspectRatio) {
          // Image is wider than target - fit by height and crop sides
          drawHeight = canvas.height;
          drawWidth = drawHeight * imgAspectRatio;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          // Image is taller than target - fit by width and crop top/bottom
          drawWidth = canvas.width;
          drawHeight = drawWidth / imgAspectRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }

        // Fill background with a subtle color
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Convert canvas to blob URL
        canvas.toBlob((blob) => {
          if (blob) {
            const processedUrl = URL.createObjectURL(blob);
            resolve(processedUrl);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  });
};

// Hook to process images
export const useProcessedImages = (imageUrls: string[]) => {
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setProcessedImages([]);
      return;
    }

    setIsProcessing(true);
    
    const processImages = async () => {
      try {
        const processed = await Promise.all(
          imageUrls.map(url => processImageForTripCard(url))
        );
        setProcessedImages(processed);
      } catch (error) {
        console.error('Error processing images:', error);
        // Fallback to original images
        setProcessedImages(imageUrls);
      } finally {
        setIsProcessing(false);
      }
    };

    processImages();

    // Cleanup function to revoke object URLs
    return () => {
      processedImages.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageUrls]);

  return { processedImages, isProcessing };
};