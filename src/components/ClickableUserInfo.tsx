import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface ClickableUserInfoProps {
  username?: string;
  name?: string;
  avatar?: string;
  userId?: string;
  children?: React.ReactNode;
  className?: string;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: "sm" | "md" | "lg";
}

export const ClickableUserInfo = ({
  username,
  name,
  avatar,
  userId,
  children,
  className = "",
  showAvatar = true,
  showName = true,
  avatarSize = "md"
}: ClickableUserInfoProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Don't make it clickable if it's the current user's own content
  const isOwnContent = user && userId === user.id;

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if it's the user's own content
    if (isOwnContent) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Use username if available, otherwise fall back to userId
    const identifier = username || userId;
    if (identifier) {
      navigate(`/profile/${identifier}`);
    }
  };

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-10 w-10"
  };

  if (children) {
    return (
      <div 
        onClick={!isOwnContent ? handleClick : undefined}
        className={`${!isOwnContent ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div 
      onClick={!isOwnContent ? handleClick : undefined}
      className={`flex items-center gap-2 ${!isOwnContent ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
    >
      {showAvatar && (
        <Avatar className={sizeClasses[avatarSize]}>
          <AvatarImage src={avatar || ''} />
          <AvatarFallback className="text-xs">
            {name?.charAt(0) || username?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      {showName && (
        <span className="font-medium truncate">
          {name || username || 'Unknown User'}
        </span>
      )}
    </div>
  );
};

export default ClickableUserInfo;