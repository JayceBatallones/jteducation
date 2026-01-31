"use client";

import { useMemo, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enAU } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-AU": enAU };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  eventType: string;
  isRequired: boolean;
  color: string;
  cohortName?: string;
  programName?: string;
  attendanceStatus: "attending" | "not_attending" | null;
}

interface BigCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  defaultView?: "month" | "week" | "day" | "agenda";
}

export function BigCalendar({ events, onSelectEvent, defaultView = "week" }: BigCalendarProps) {
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">(defaultView);
  const [date, setDate] = useState(new Date());

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: "4px",
        opacity: 0.9,
        color: "#000",
        border: "none",
        fontSize: "12px",
      },
    };
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event);
    },
    [onSelectEvent]
  );

  const calendarEvents = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      })),
    [events]
  );

  return (
    <div className="h-[600px] bg-background rounded-lg border p-4">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={(newView) => setView(newView as "month" | "week" | "day" | "agenda")}
        date={date}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        popup
        selectable={false}
        style={{ height: "100%" }}
      />
    </div>
  );
}
