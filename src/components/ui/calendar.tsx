import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-gradient-to-r from-primary/10 to-primary-glow/10 border-primary/20 p-0 hover:bg-gradient-to-r hover:from-primary/20 hover:to-primary-glow/20 hover:border-primary/40 transition-all duration-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        head_cell:
          "text-primary font-semibold rounded-md w-10 h-10 flex items-center justify-center text-sm bg-gradient-to-r from-primary/5 to-primary-glow/5",
        row: "flex w-full mt-1",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gradient-to-r [&:has([aria-selected].day-outside)]:from-primary/20 [&:has([aria-selected].day-outside)]:to-primary-glow/20 [&:has([aria-selected])]:bg-gradient-to-r [&:has([aria-selected])]:from-primary/10 [&:has([aria-selected])]:to-primary-glow/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-medium aria-selected:opacity-100 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary-glow/10 hover:text-primary transition-all duration-200 rounded-md"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-r from-primary to-primary-glow text-white hover:from-primary-glow hover:to-primary hover:text-white focus:from-primary-glow focus:to-primary focus:text-white shadow-lg transform scale-105 transition-all duration-200",
        day_today: "bg-gradient-to-r from-accent to-accent-glow text-accent-foreground font-bold border-2 border-primary/30 shadow-sm",
        day_outside:
          "day-outside text-muted-foreground/50 opacity-40 aria-selected:bg-gradient-to-r aria-selected:from-primary/20 aria-selected:to-primary-glow/20 aria-selected:text-primary aria-selected:opacity-70",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-gradient-to-r aria-selected:from-primary/20 aria-selected:to-primary-glow/20 aria-selected:text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ..._props }) => <ChevronLeft className="h-4 w-4 text-primary" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
