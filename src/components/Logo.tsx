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
        viewBox="0 0 320 80" 
        className={`${sizeClasses[size]} w-auto`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Paper Airplane - more accurate to original */}
        <g transform="translate(20, 20)">
          {/* Main airplane body */}
          <path 
            d="M0 20 L30 5 L35 20 L30 35 L0 20 Z" 
            fill="hsl(var(--primary))" 
          />
          {/* Airplane fold line */}
          <path 
            d="M0 20 L30 20 L35 20" 
            stroke="hsl(var(--primary-foreground))" 
            strokeWidth="1"
            opacity="0.3"
          />
          {/* Right wing shading */}
          <path 
            d="M30 5 L35 20 L30 20 Z" 
            fill="hsl(var(--primary-glow))" 
          />
          {/* Left wing shading */}
          <path 
            d="M30 20 L35 20 L30 35 Z" 
            fill="hsl(var(--primary))" 
            opacity="0.8"
          />
        </g>
        
        {/* Looping dotted trail - matching original pattern */}
        <g>
          {/* First loop */}
          <circle cx="70" cy="40" r="2" fill="hsl(var(--primary))" className="animate-pulse" />
          <circle cx="75" cy="35" r="1.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.1s'}} />
          <circle cx="82" cy="32" r="1.6" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.2s'}} />
          <circle cx="90" cy="30" r="1.4" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.3s'}} />
          <circle cx="98" cy="32" r="1.2" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.4s'}} />
          <circle cx="105" cy="36" r="1" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.5s'}} />
          
          {/* Spiral part */}
          <circle cx="110" cy="42" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.6s'}} />
          <circle cx="112" cy="48" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.7s'}} />
          <circle cx="110" cy="54" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.8s'}} />
          <circle cx="105" cy="58" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '0.9s'}} />
          <circle cx="98" cy="60" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '1.0s'}} />
          <circle cx="90" cy="58" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '1.1s'}} />
          <circle cx="85" cy="54" r="0.8" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '1.2s'}} />
          
          {/* Continuing trail */}
          <circle cx="120" cy="56" r="0.6" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '1.3s'}} />
          <circle cx="128" cy="52" r="0.5" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '1.4s'}} />
          <circle cx="135" cy="48" r="0.4" fill="hsl(var(--primary))" className="animate-pulse" style={{animationDelay: '1.5s'}} />
        </g>
        
        {/* Text "iter" - clean modern font matching original */}
        <text 
          x="160" 
          y="52" 
          fontSize="32" 
          fontWeight="400" 
          fill="hsl(var(--foreground))"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          letterSpacing="-0.02em"
        >
          iter
        </text>
      </svg>
    </div>
  );
};