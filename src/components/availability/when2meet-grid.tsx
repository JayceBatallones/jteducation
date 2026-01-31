"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK, TIME_SLOTS, getTimeLabel, getTimeSlotCount } from "@/lib/utils";

interface When2MeetGridProps {
  value: boolean[][];
  onChange: (value: boolean[][]) => void;
  consultMode?: boolean;
  consultValue?: boolean[][];
  onConsultChange?: (value: boolean[][]) => void;
  readOnly?: boolean;
}

export function When2MeetGrid({
  value,
  onChange,
  consultMode = false,
  consultValue,
  onConsultChange,
  readOnly = false,
}: When2MeetGridProps) {
  const slotCount = getTimeSlotCount();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ day: number; slot: number } | null>(null);
  const [selectionValue, setSelectionValue] = useState<boolean>(true);
  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize grid if empty
  useEffect(() => {
    if (!value || value.length === 0) {
      const initialGrid = Array(7).fill(null).map(() => Array(slotCount).fill(false));
      onChange(initialGrid);
    }
  }, [value, onChange, slotCount]);

  const handleMouseDown = useCallback(
    (dayIndex: number, slotIndex: number) => {
      if (readOnly) return;

      const currentGrid = consultMode && consultValue ? consultValue : value;
      const currentValue = currentGrid[dayIndex]?.[slotIndex] ?? false;
      setIsSelecting(true);
      setSelectionStart({ day: dayIndex, slot: slotIndex });
      setSelectionValue(!currentValue);

      // Toggle single cell
      const newGrid = currentGrid.map((day, dIdx) =>
        day.map((slot, sIdx) =>
          dIdx === dayIndex && sIdx === slotIndex ? !currentValue : slot
        )
      );

      if (consultMode && onConsultChange) {
        onConsultChange(newGrid);
      } else {
        onChange(newGrid);
      }
    },
    [value, consultValue, onChange, onConsultChange, consultMode, readOnly]
  );

  const handleMouseEnter = useCallback(
    (dayIndex: number, slotIndex: number) => {
      if (!isSelecting || !selectionStart || readOnly) return;

      const currentGrid = consultMode && consultValue ? consultValue : value;
      const minDay = Math.min(selectionStart.day, dayIndex);
      const maxDay = Math.max(selectionStart.day, dayIndex);
      const minSlot = Math.min(selectionStart.slot, slotIndex);
      const maxSlot = Math.max(selectionStart.slot, slotIndex);

      const newGrid = currentGrid.map((day, dIdx) =>
        day.map((slot, sIdx) => {
          if (dIdx >= minDay && dIdx <= maxDay && sIdx >= minSlot && sIdx <= maxSlot) {
            return selectionValue;
          }
          return slot;
        })
      );

      if (consultMode && onConsultChange) {
        onConsultChange(newGrid);
      } else {
        onChange(newGrid);
      }
    },
    [isSelecting, selectionStart, selectionValue, value, consultValue, onChange, onConsultChange, consultMode, readOnly]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setSelectionStart(null);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setSelectionStart(null);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const currentGrid = consultMode && consultValue ? consultValue : value;

  // Generate time labels (show every hour)
  const timeLabels = [];
  for (let i = 0; i < slotCount; i += 2) {
    timeLabels.push({ index: i, label: getTimeLabel(i) });
  }

  return (
    <div className="overflow-x-auto">
      <div
        ref={gridRef}
        className="inline-block select-none"
        onMouseLeave={handleMouseUp}
      >
        {/* Header row with day names */}
        <div className="flex">
          <div className="w-16 flex-shrink-0" /> {/* Time label column spacer */}
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="w-20 text-center text-sm font-medium py-2 border-b"
            >
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0">
            {timeLabels.map(({ index, label }) => (
              <div
                key={index}
                className="h-6 text-xs text-muted-foreground pr-2 text-right flex items-center justify-end"
                style={{ marginTop: index === 0 ? 0 : undefined }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS_OF_WEEK.map((day, dayIndex) => (
            <div key={day} className="w-20">
              {Array.from({ length: slotCount }).map((_, slotIndex) => {
                const isSelected = currentGrid[dayIndex]?.[slotIndex] ?? false;
                const isHourMark = slotIndex % 2 === 0;

                return (
                  <div
                    key={slotIndex}
                    className={cn(
                      "h-3 border-r border-b cursor-pointer transition-colors",
                      isHourMark && "border-t border-t-border/50",
                      isSelected
                        ? consultMode
                          ? "bg-purple-500 hover:bg-purple-600"
                          : "bg-primary hover:bg-primary/90"
                        : "bg-muted/30 hover:bg-muted",
                      readOnly && "cursor-default"
                    )}
                    onMouseDown={() => handleMouseDown(dayIndex, slotIndex)}
                    onMouseEnter={() => handleMouseEnter(dayIndex, slotIndex)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className={cn("w-4 h-4 rounded", consultMode ? "bg-purple-500" : "bg-primary")} />
          <span>{consultMode ? "Available for consults" : "Available"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/30 border" />
          <span>Not available</span>
        </div>
      </div>

      {!readOnly && (
        <p className="text-xs text-muted-foreground mt-2">
          Click and drag to select time slots. Click again to deselect.
        </p>
      )}
    </div>
  );
}
