"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month names list
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days in month calculation
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  // Start offset day calculation (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonthOffset = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const startOffset = getFirstDayOfMonthOffset(year, month);

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(year, month, day);
    // Format YYYY-MM-DD
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    onChange?.(formattedDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  // Format selected date for display button
  const getDisplayDate = () => {
    if (!value) return placeholder;
    try {
      const d = new Date(value);
      return d.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return value;
    }
  };

  return (
    <div className="relative inline-block w-full font-sans">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer select-none text-left h-9 shadow-xs"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className={cn(!value && "text-muted-foreground/60")}>
            {getDisplayDate()}
          </span>
        </span>
        {value && (
          <span
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ml-1.5"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop for clickout */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar popup card */}
          <div className="absolute left-0 mt-1.5 w-64 bg-card border border-border shadow-xl rounded-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left font-sans select-none">
            
            {/* Header controls */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md hover:bg-secondary border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-foreground font-mono">
                {MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md hover:bg-secondary border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Weekdays labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground font-mono mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-7 w-7" />;
                }

                // Check if current day is the active selected date
                const isSelected = value === `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "h-7 w-7 rounded-md text-[11px] font-medium font-mono flex items-center justify-center cursor-pointer transition-all",
                      isSelected 
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
