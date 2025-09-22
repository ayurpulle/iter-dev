import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = {
  className?: string;
  mode?: "single" | "range";
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
};

function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  disabled,
  initialFocus,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the month to align with the first day of the week
  const startPadding = monthStart.getDay();
  const paddingDays = Array(startPadding).fill(null);

  // Create rows of 7 days each
  const allDays = [...paddingDays, ...days];
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const handleDateClick = (date: Date) => {
    if (disabled?.(date)) return;
    onSelect?.(date);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className={cn("p-3 pointer-events-auto", className)} {...props}>
      <div className="space-y-3 w-full">
        {/* Header with month/year and navigation */}
        <div className="flex justify-center pt-1 relative items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={handlePrevMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-8 w-8 p-0 bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground absolute left-1"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-8 w-8 p-0 bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground absolute right-1"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="w-full">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={dayIndex} className="h-10 w-full" />;
                }

                const isSelected = selected && isSameDay(day, selected);
                const isDisabled = disabled?.(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={dayIndex}
                    onClick={() => handleDateClick(day)}
                    disabled={isDisabled}
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-10 w-full p-0 font-normal text-foreground rounded-md",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      isToday && !isSelected && "bg-accent text-accent-foreground font-medium border border-border",
                      !isCurrentMonth && "text-muted-foreground/50 opacity-50",
                      isDisabled && "text-muted-foreground/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
