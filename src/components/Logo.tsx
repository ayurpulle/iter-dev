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
      <svg 
        viewBox="0 0 200 60" 
        className={`${sizeClasses[size]} w-auto`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Paper Airplane */}
        <path 
          d="M20 30L35 20L40 30L35 40L20 30Z" 
          fill="hsl(var(--primary))" 
          stroke="hsl(var(--primary))" 
          strokeWidth="1"
        />
        <path 
          d="M35 20L45 30L35 40" 
          fill="hsl(var(--primary-glow))" 
          stroke="hsl(var(--primary))" 
          strokeWidth="1"
        />
        
        {/* Dotted Trail */}
        <circle cx="55" cy="30" r="2" fill="hsl(var(--primary))" className="animate-pulse" />
        <circle cx="65" cy="28" r="1.5" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.2s'}} />
        <circle cx="75" cy="32" r="1" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.4s'}} />
        <circle cx="85" cy="30" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.6s'}} />
        
        {/* Text "iter" */}
        <text 
          x="100" 
          y="40" 
          fontSize="24" 
          fontWeight="bold" 
          fill="hsl(var(--foreground))"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          iter
        </text>
      </svg>
    </div>
  );
};