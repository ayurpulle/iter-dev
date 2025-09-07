import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2 } from 'lucide-react';
import { usePostManagement } from '@/hooks/usePostManagement';

interface PostEditDialogProps {
  postId: string;
  currentContent: string;
  onContentUpdated?: (newContent: string) => void;
}

export const PostEditDialog = ({ postId, currentContent, onContentUpdated }: PostEditDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(currentContent);
  const { updatePost, loading } = usePostManagement();

  const handleSave = async () => {
    const result = await updatePost(postId, { content });
    if (result) {
      onContentUpdated?.(content);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setContent(currentContent);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Make changes to your post content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[120px]"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};