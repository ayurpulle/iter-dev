import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  const handleClick = (e: React.MouseEvent) => {
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
        onClick={handleClick}
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div 
      onClick={handleClick}
      className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
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