import { useMessageCount } from "@/hooks/useMessageCount";

interface MessageBadgeProps {
  children: React.ReactNode;
}

const MessageBadge = ({ children }: MessageBadgeProps) => {
  const unreadCount = useMessageCount();
  console.log('MessageBadge: unreadCount =', unreadCount);

  return (
    <div className="relative">
      {children}
      {(unreadCount > 0) && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] z-10">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </div>
  );
};

export default MessageBadge;