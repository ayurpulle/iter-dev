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
        src="/lovable-uploads/56b60369-8802-491e-94b0-4a1141bcc5a6.png"
        alt="Iter Logo"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};