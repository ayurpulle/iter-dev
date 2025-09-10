import { useState, useEffect } from "react";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export const Logo = ({ size = "md", className = "", onClick }: LogoProps) => {
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sizeClasses = {
    sm: "h-10",
    md: "h-14", 
    lg: "h-20"
  };

  useEffect(() => {
    const processLogo = async () => {
      setIsProcessing(true);
      try {
        // Fetch the original logo
        const response = await fetch("/lovable-uploads/56b60369-8802-491e-94b0-4a1141bcc5a6.png");
        const blob = await response.blob();
        
        // Load as image element
        const imageElement = await loadImage(blob);
        
        // Remove background
        const processedBlob = await removeBackground(imageElement);
        
        // Create URL for the processed image
        const url = URL.createObjectURL(processedBlob);
        setProcessedImageUrl(url);
      } catch (error) {
        console.error("Failed to process logo:", error);
        // Fallback to original image
        setProcessedImageUrl("/lovable-uploads/56b60369-8802-491e-94b0-4a1141bcc5a6.png");
      } finally {
        setIsProcessing(false);
      }
    };

    processLogo();

    // Cleanup function to revoke object URL
    return () => {
      if (processedImageUrl) {
        URL.revokeObjectURL(processedImageUrl);
      }
    };
  }, []);

  return (
    <div 
      className={`cursor-pointer hover:opacity-80 transition-opacity duration-200 ${className}`}
      onClick={onClick}
    >
      {isProcessing ? (
        <div className={`${sizeClasses[size]} w-auto flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <img 
          src={processedImageUrl || "/lovable-uploads/56b60369-8802-491e-94b0-4a1141bcc5a6.png"}
          alt="Iter Logo"
          className={`${sizeClasses[size]} w-auto object-contain`}
        />
      )}
    </div>
  );
};