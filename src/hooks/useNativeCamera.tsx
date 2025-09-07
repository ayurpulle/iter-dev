import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useToast } from './use-toast';

export const useNativeCamera = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const takePhoto = async () => {
    try {
      setLoading(true);
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      return photo.dataUrl;
    } catch (error) {
      console.error('Error taking photo:', error);
      toast({
        title: "Camera Error",
        description: "Failed to take photo. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectFromGallery = async () => {
    try {
      setLoading(true);
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      return photo.dataUrl;
    } catch (error) {
      console.error('Error selecting photo:', error);
      toast({
        title: "Photo Selection Error",
        description: "Failed to select photo. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ['camera', 'photos']
      });
      return permissions;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      toast({
        title: "Permission Error",
        description: "Camera permissions are required to add photos.",
        variant: "destructive"
      });
      return null;
    }
  };

  return {
    takePhoto,
    selectFromGallery,
    requestPermissions,
    loading
  };
};