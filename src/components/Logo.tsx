import { Send } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export const Logo = ({ size = "md", className = "", onClick }: LogoProps) => {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8", 
    lg: "h-12"
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl"
  };

  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity duration-200 ${className}`}
      onClick={onClick}
    >
      <div className="relative">
        <Send 
          size={iconSizes[size]} 
          className="text-primary transform -rotate-45" 
          strokeWidth={2.5}
        />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary/30 rounded-full animate-pulse" />
      </div>
      <span className={`font-bold text-primary ${textSizes[size]} tracking-tight`}>
        iter
      </span>
    </div>
  );
};