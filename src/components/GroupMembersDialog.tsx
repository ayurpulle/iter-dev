import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupMember {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

interface GroupMembersDialogProps {
  conversationId: string;
  groupName: string;
  children: React.ReactNode;
}

export const GroupMembersDialog = ({ 
  conversationId, 
  groupName, 
  children 
}: GroupMembersDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchGroupMembers = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      // First get the conversation to get participant IDs
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      if (conversation?.participants) {
        // Fetch profile data for all participants
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, username, avatar')
          .in('id', conversation.participants);

        if (profilesError) throw profilesError;

        setMembers(profiles || []);
      }
    } catch (error: any) {
      console.error('Error fetching group members:', error);
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGroupMembers();
    }
  }, [isOpen, conversationId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {groupName}
          </DialogTitle>
          <DialogDescription>
            Group members ({members.length})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar || ''} />
                  <AvatarFallback>
                    {member.name?.charAt(0) || member.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {member.name || member.username || 'Unknown User'}
                  </p>
                  {member.name && member.username && (
                    <p className="text-sm text-muted-foreground">
                      @{member.username}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};