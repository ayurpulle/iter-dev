import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Reply, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Reply {
  id: string;
  content: string;
  user: { name: string; avatar: string | null };
  created_at: string;
  user_id?: string;
}

interface CommentRepliesProps {
  commentId: string;
  postId: string;
  postUserId: string;
  replies: Reply[];
  onRepliesUpdate: (commentId: string, replies: Reply[]) => void;
}

export const CommentReplies = ({ 
  commentId, 
  postId, 
  postUserId, 
  replies, 
  onRepliesUpdate 
}: CommentRepliesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleAddReply = async () => {
    if (!replyContent.trim() || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_id: commentId // assuming we add parent_id column for replies
        })
        .select('id, content, created_at, user_id')
        .single();

      if (error) throw error;

      // Get user profile for the new reply
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('user_id', user.id)
        .single();

      const newReply = {
        id: data.id,
        content: data.content,
        user: {
          name: profile?.name || 'User',
          avatar: profile?.avatar || null
        },
        created_at: "now",
        user_id: data.user_id
      };
      
      const updatedReplies = [...replies, newReply];
      onRepliesUpdate(commentId, updatedReplies);
      setReplyContent("");
      setShowReplyInput(false);

      // Create notification for post author (if different from replier)
      if (postUserId !== user.id) {
        await supabase.from('notifications').insert({
          user_id: postUserId,
          type: 'comment_reply',
          title: 'New Reply',
          message: `${profile?.name || 'Someone'} replied to a comment on your post`,
          related_user_id: user.id,
          related_post_id: postId,
          related_comment_id: data.id
        });
      }
      
      toast({
        title: "Reply added",
        description: "Your reply has been posted",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      const updatedReplies = replies.filter(reply => reply.id !== replyId);
      onRepliesUpdate(commentId, updatedReplies);
      
      toast({
        title: "Reply deleted",
        description: "Your reply has been removed",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({
        title: "Error",
        description: "Failed to delete reply",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (replies.length === 0 && !showReplyInput) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowReplyInput(true)}
        className="text-xs text-muted-foreground p-0 h-auto mt-1"
      >
        <Reply size={12} className="mr-1" />
        Reply
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {replies.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReplies(!showReplies)}
          className="text-xs text-muted-foreground p-0 h-auto"
        >
          {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </Button>
      )}

      {showReplies && (
        <div className="ml-4 space-y-2">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <Avatar className="w-5 h-5">
                <AvatarImage src={reply.user.avatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {reply.user.name[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium">{reply.user.name}</p>
                  <p className="text-xs text-muted-foreground">{reply.created_at}</p>
                  {reply.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteReply(reply.id)}
                    >
                      <Trash2 size={10} />
                    </Button>
                  )}
                </div>
                <p className="text-xs break-words">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showReplyInput && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReplyInput(true)}
          className="text-xs text-muted-foreground p-0 h-auto"
        >
          <Reply size={12} className="mr-1" />
          Reply
        </Button>
      )}

      {showReplyInput && (
        <div className="ml-4 flex gap-2">
          <Input
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="text-xs h-7"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddReply();
              }
            }}
          />
          <Button 
            onClick={handleAddReply}
            disabled={!replyContent.trim()}
            size="sm"
            className="h-7 px-2"
          >
            <Send size={12} />
          </Button>
          <Button 
            onClick={() => {
              setShowReplyInput(false);
              setReplyContent('');
            }}
            variant="ghost"
            size="sm"
            className="h-7 px-2"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};