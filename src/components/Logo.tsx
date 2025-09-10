interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export const Logo = ({ size = "md", className = "", onClick }: LogoProps) => {
  const sizeClasses = {
    sm: "h-10",
    md: "h-14", 
    lg: "h-20"
  };

  return (
    <div 
      className={`cursor-pointer hover:opacity-80 transition-opacity duration-200 ${className}`}
      onClick={onClick}
    >
      <img 
        src="/lovable-uploads/7dbc7fa3-6806-408a-8afe-e0f3f239b9d4.png"
        alt="Iter Logo"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};