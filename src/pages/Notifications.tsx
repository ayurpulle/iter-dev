import { useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Users, MapPin, Sparkles, Clock, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import { useNotifications } from "@/hooks/useNotifications";
import { useFriends } from "@/hooks/useFriends";
import { useItineraryCollaboration } from "@/hooks/useItineraryCollaboration";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch } = useNotifications();
  const { acceptFriendRequest, rejectFriendRequest } = useFriends();
  const { respondToInvite } = useItineraryCollaboration();
  
  // We'll need to trigger a refresh of saved itineraries when collaboration is accepted
  // This could be done with a custom event or by importing useSavedItineraries

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      toast({
        title: "Friend request accepted",
        description: "You are now friends!"
      });
      // Refresh notifications to remove the processed request
      await refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      toast({
        title: "Friend request rejected",
        description: "Request has been declined"
      });
      // Refresh notifications to remove the processed request
      await refetch();
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to reject friend request",
        variant: "destructive"
      });
    }
  };

  const handleItineraryInviteResponse = async (collaborationId: string, status: 'accepted' | 'declined') => {
    try {
      const success = await respondToInvite(collaborationId, status);
      if (success) {
        toast({
          title: `Invite ${status}`,
          description: `Itinerary collaboration invite ${status} successfully!`
        });
        await refetch();
        
        // If accepted, emit an event that other components can listen to for refreshing
        if (status === 'accepted') {
          window.dispatchEvent(new CustomEvent('itinerary-collaboration-accepted'));
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to invite",
        variant: "destructive"
      });
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read if not already read
      if (!notification.read) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);
      }

      // Only navigate for post-related notifications
      if (notification.related_post_id && (notification.type === 'like' || notification.type === 'comment' || notification.type === 'comment_reply')) {
        navigate(`/post/${notification.related_post_id}`);
      }
      // For itinerary notifications, just mark as read (no navigation)
      
      // Refresh notifications
      await refetch();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={16} className="text-red-500" />;
      case 'comment': return <MessageCircle size={16} className="text-blue-500" />;
      case 'reply': return <MessageCircle size={16} className="text-blue-500" />;
      case 'friend_request': return <Users size={16} className="text-green-500" />;
      case 'friend_post': return <Users size={16} className="text-green-500" />;
      case 'iter_inspiration': return <Sparkles size={16} className="text-purple-500" />;
      case 'itinerary_invite': return <MapPin size={16} className="text-blue-500" />;
      case 'itinerary_share': return <Share2 size={16} className="text-green-500" />;
      case 'itinerary_complete': return <Sparkles size={16} className="text-green-500" />;
      case 'itinerary_error': return <Clock size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return 'bg-red-50 border-red-100';
      case 'comment': return 'bg-blue-50 border-blue-100';
      case 'reply': return 'bg-blue-50 border-blue-100';
      case 'friend_request': return 'bg-green-50 border-green-100';
      case 'friend_post': return 'bg-green-50 border-green-100';
      case 'iter_inspiration': return 'bg-purple-50 border-purple-100';
      case 'itinerary_invite': return 'bg-blue-50 border-blue-100';
      case 'itinerary_share': return 'bg-green-50 border-green-100';
      case 'itinerary_complete': return 'bg-green-50 border-green-100';
      case 'itinerary_error': return 'bg-red-50 border-red-100';
      default: return 'bg-muted/50';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors ${
                    !notification.read 
                      ? `${getNotificationColor(notification.type)} border-l-4` 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-foreground">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>

                          {/* Avatar */}
                          {notification.profiles && (
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={notification.profiles.avatar} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {(notification.profiles.name || notification.profiles.username || 'U')
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        {/* Time and Status */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs px-2 py-0">
                              New
                            </Badge>
                          )}
                        </div>
                        {/* Friend Request Actions */}
                        {notification.type === 'friend_request' && notification.friend_request_id && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptFriendRequest(notification.friend_request_id!);
                              }}
                              className="text-xs"
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectFriendRequest(notification.friend_request_id!);
                              }}
                              className="text-xs"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                        
                        {/* Itinerary Invite Actions */}
                        {notification.type === 'itinerary_invite' && notification.data?.collaboration_id && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItineraryInviteResponse(notification.data.collaboration_id, 'accepted');
                              }}
                              className="text-xs"
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItineraryInviteResponse(notification.data.collaboration_id, 'declined');
                              }}
                              className="text-xs"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">
                You'll see likes, comments, and updates from friends here
              </p>
            </div>
          )}
        </div>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Notifications;