"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid } from "lucide-react";
import { BigCalendar, type CalendarEvent } from "@/components/calendar/big-calendar";

interface ScheduleClientProps {
  events: CalendarEvent[];
}

export function ScheduleClient({ events }: ScheduleClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("calendar");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const dayKey = format(event.start, "yyyy-MM-dd");
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(event);
    });
    // Sort events within each day by start time
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    });
    return map;
  }, [events]);

  const eventTypeColors: Record<string, string> = {
    content: "bg-blue-100 text-blue-800 border-blue-200",
    applied: "bg-green-100 text-green-800 border-green-200",
    "drop-in": "bg-purple-100 text-purple-800 border-purple-200",
    consult: "bg-orange-100 text-orange-800 border-orange-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">
            View your upcoming classes and events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="rounded-r-none"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <BigCalendar
          events={events}
          onSelectEvent={(event) => setSelectedEvent(event)}
          defaultView="week"
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(dayKey) || [];
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={dayKey}
              className={isToday ? "border-primary" : undefined}
            >
              <CardHeader className="py-2 px-3">
                <div
                  className={`text-sm font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}
                >
                  {format(day, "d")}
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2 space-y-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No events
                  </p>
                ) : (
                  dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                        selectedEvent?.id === event.id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      style={{
                        borderLeftWidth: "3px",
                        borderLeftColor: event.color,
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-muted-foreground">
                        {format(event.start, "h:mm a")}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
        </>
      )}

      {/* Event Detail Panel */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedEvent.color }}
                />
                <CardTitle>{selectedEvent.title}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Date:</span>
                <span>{format(selectedEvent.start, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Time:</span>
                <span>
                  {format(selectedEvent.start, "h:mm a")} -{" "}
                  {format(selectedEvent.end, "h:mm a")}
                </span>
              </div>
              {selectedEvent.cohortName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Cohort:</span>
                  <span>{selectedEvent.cohortName}</span>
                </div>
              )}
              {selectedEvent.programName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Program:</span>
                  <span>{selectedEvent.programName}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={eventTypeColors[selectedEvent.eventType]}>
                {selectedEvent.eventType}
              </Badge>
              {selectedEvent.isRequired && (
                <Badge variant="destructive">Required</Badge>
              )}
              {selectedEvent.attendanceStatus === "attending" && (
                <Badge variant="success">Attended</Badge>
              )}
              {selectedEvent.attendanceStatus === "not_attending" && (
                <Badge variant="destructive">Not Attended</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
