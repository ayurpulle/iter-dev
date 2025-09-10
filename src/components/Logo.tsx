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
        src="/lovable-uploads/a30a53bf-9348-456b-9b7f-0ca6caf51858.png"
        alt="Iter Logo"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};