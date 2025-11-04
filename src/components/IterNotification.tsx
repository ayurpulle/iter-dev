import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface IterNotificationProps {
  type: "generating" | "ready";
  onDismiss: () => void;
}

export const IterNotification = ({ type, onDismiss }: IterNotificationProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const navigate = useNavigate();

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > 100) {
      onDismiss();
    } else {
      setDragOffset(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (dragOffset > 100) {
      onDismiss();
    } else {
      setDragOffset(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleViewTrips = () => {
    navigate("/trip-planning", { state: { openSavedTrips: true } });
    onDismiss();
  };

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-50 mx-auto max-w-md transition-all duration-200",
        "top-20"
      )}
      style={{
        transform: `translateX(${dragOffset}px)`,
        opacity: dragOffset > 50 ? 1 - dragOffset / 200 : 1,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {type === "generating" ? "Generating Your Iter" : "Your Iter is Ready!"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {type === "generating"
                ? "Your dream holiday will be ready in a moment!"
                : "Your itinerary has been generated successfully."}
            </p>
            {type === "ready" && (
              <Button
                onClick={handleViewTrips}
                className="mt-3 w-full"
                size="sm"
              >
                View Saved Trips
              </Button>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
