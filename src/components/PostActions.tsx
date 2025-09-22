import { useState } from 'react';
import { MoreHorizontal, Trash2, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PostEditDialog } from './PostEditDialog';
import { PostPrivacyToggle } from './PostPrivacyToggle';
import { ShareToChatDialog } from './ShareToChatDialog';
import { usePostManagement } from '@/hooks/usePostManagement';
import { useAuth } from '@/hooks/useAuth';

interface PostActionsProps {
  postId: string;
  postUserId: string;
  content: string;
  isPrivate: boolean;
  onPostDeleted?: () => void;
  onPostUpdated?: (updates: any) => void;
}

export const PostActions = ({ 
  postId, 
  postUserId, 
  content, 
  isPrivate, 
  onPostDeleted, 
  onPostUpdated 
}: PostActionsProps) => {
  const { user } = useAuth();
  const { deletePost, loading } = usePostManagement();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const isOwner = user?.id === postUserId;

  const handleDelete = async () => {
    const success = await deletePost(postId);
    if (success) {
      onPostDeleted?.();
    }
    setShowDeleteAlert(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleContentUpdate = (newContent: string) => {
    onPostUpdated?.({ content: newContent });
  };

  const handlePrivacyUpdate = (newPrivacy: boolean) => {
    onPostUpdated?.({ is_private: newPrivacy });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share URL
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div className="w-full">
              <ShareToChatDialog
                itemType="post"
                itemId={postId}
                itemTitle={content.slice(0, 50) + (content.length > 50 ? '...' : '')}
                triggerText="Send to Chat"
                variant="ghost"
                size="sm"
              />
            </div>
          </DropdownMenuItem>
          
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <PostEditDialog
                  postId={postId}
                  currentContent={content}
                  onContentUpdated={handleContentUpdate}
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="w-full">
                  <PostPrivacyToggle
                    postId={postId}
                    isPrivate={isPrivate}
                    onPrivacyChanged={handlePrivacyUpdate}
                  />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteAlert(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};