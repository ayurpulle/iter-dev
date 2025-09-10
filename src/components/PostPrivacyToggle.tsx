import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Lock, Globe } from 'lucide-react';
import { usePostManagement } from '@/hooks/usePostManagement';

interface PostPrivacyToggleProps {
  postId: string;
  isPrivate: boolean;
  onPrivacyChanged?: (isPrivate: boolean) => void;
}

export const PostPrivacyToggle = ({ postId, isPrivate, onPrivacyChanged }: PostPrivacyToggleProps) => {
  const [currentPrivacy, setCurrentPrivacy] = useState(isPrivate);
  const { togglePostPrivacy, loading } = usePostManagement();

  const handlePrivacyToggle = async (checked: boolean) => {
    const newPrivacy = checked;
    
    // Update UI immediately for responsive feedback
    setCurrentPrivacy(newPrivacy);
    onPrivacyChanged?.(newPrivacy);
    
    const result = await togglePostPrivacy(postId, newPrivacy);
    
    if (!result) {
      // Revert on failure
      setCurrentPrivacy(isPrivate);
      onPrivacyChanged?.(isPrivate);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {currentPrivacy ? (
        <Lock className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Globe className="h-4 w-4 text-muted-foreground" />
      )}
      <Label htmlFor={`privacy-${postId}`} className="text-sm">
        {currentPrivacy ? 'Private' : 'Public'}
      </Label>
      <Switch
        id={`privacy-${postId}`}
        checked={currentPrivacy}
        onCheckedChange={handlePrivacyToggle}
        disabled={loading}
      />
    </div>
  );
};