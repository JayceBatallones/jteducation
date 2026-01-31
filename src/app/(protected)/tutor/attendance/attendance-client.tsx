"use client";

import { useState, useEffect } from "react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Minus } from "lucide-react";
import type { Event } from "@/types/database";

interface AttendanceRecord {
  id: string;
  user_id: string;
  status: "attending" | "not_attending" | null;
  marked_at: string | null;
  profiles: { id: string; full_name: string | null; email: string };
}

interface EventWithAttendance extends Event {
  cohorts?: { id: string; name: string; color: string } | null;
  programs?: { id: string; name: string } | null;
  attendance: AttendanceRecord[];
}

interface Cohort {
  id: string;
  name: string;
  color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programs: { name: string } | { name: string }[] | any;
}

interface TutorAttendanceClientProps {
  events: EventWithAttendance[];
  cohorts: Cohort[];
  updateAttendance: (
    attendanceId: string,
    status: "attending" | "not_attending" | null
  ) => Promise<void>;
  initialEventId?: string;
}

export function TutorAttendanceClient({
  events,
  cohorts,
  updateAttendance,
  initialEventId,
}: TutorAttendanceClientProps) {
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(
    initialEventId || null
  );

  useEffect(() => {
    if (initialEventId) {
      setSelectedEvent(initialEventId);
    }
  }, [initialEventId]);

  const filteredEvents =
    selectedCohort === "all"
      ? events
      : events.filter((e) => e.cohort_id === selectedCohort);

  const currentEvent = selectedEvent
    ? events.find((e) => e.id === selectedEvent)
    : null;

  const handleStatusChange = async (
    attendanceId: string,
    status: "attending" | "not_attending" | null
  ) => {
    try {
      await updateAttendance(attendanceId, status);
      toast.success("Attendance updated");
    } catch (error) {
      toast.error("Failed to update attendance");
    }
  };

  const eventTypeColors: Record<string, string> = {
    content: "bg-blue-100 text-blue-800",
    applied: "bg-green-100 text-green-800",
    "drop-in": "bg-purple-100 text-purple-800",
    consult: "bg-orange-100 text-orange-800",
  };

  const getAttendanceStats = (attendance: AttendanceRecord[]) => {
    const attending = attendance.filter((a) => a.status === "attending").length;
    const notAttending = attendance.filter(
      (a) => a.status === "not_attending"
    ).length;
    const unmarked = attendance.filter((a) => a.status === null).length;
    return { attending, notAttending, unmarked, total: attendance.length };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <p className="text-muted-foreground">
          Mark attendance for students in your cohorts
        </p>
      </div>

      <div className="flex gap-4">
        <NativeSelect
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          options={[
            { value: "all", label: "All Cohorts" },
            ...cohorts.map((c) => ({
              value: c.id,
              label: `${c.name} (${Array.isArray(c.programs) ? c.programs[0]?.name : c.programs?.name})`,
            })),
          ]}
          className="w-[250px]"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-auto">
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const stats = getAttendanceStats(event.attendance);
                const eventIsPast = isPast(new Date(event.end_time));
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEvent === event.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.cohorts?.color }}
                        />
                        <span className="font-medium">{event.title}</span>
                      </div>
                      <Badge className={eventTypeColors[event.event_type]}>
                        {event.event_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), "MMM d, yyyy h:mm a")}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-green-600">✓ {stats.attending}</span>
                      <span className="text-red-600">✗ {stats.notAttending}</span>
                      <span className="text-muted-foreground">
                        ? {stats.unmarked}
                      </span>
                      {eventIsPast && stats.unmarked > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          Needs marking
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No events found. You may not have any cohorts assigned.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Detail */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentEvent ? currentEvent.title : "Select an Event"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentEvent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {currentEvent.cohorts && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: currentEvent.cohorts.color }}
                      />
                      {currentEvent.cohorts.name}
                    </div>
                  )}
                  <span>•</span>
                  <span>
                    {format(
                      new Date(currentEvent.start_time),
                      "MMM d, yyyy h:mm a"
                    )}
                  </span>
                </div>

                {currentEvent.attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students enrolled in this event
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentEvent.attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.profiles.full_name || record.profiles.email}
                          </TableCell>
                          <TableCell>
                            {record.status === "attending" ? (
                              <Badge className="bg-green-100 text-green-800">
                                Attending
                              </Badge>
                            ) : record.status === "not_attending" ? (
                              <Badge variant="destructive">Not Attending</Badge>
                            ) : (
                              <Badge variant="secondary">Unmarked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant={
                                  record.status === "attending"
                                    ? "default"
                                    : "ghost"
                                }
                                size="icon"
                                onClick={() =>
                                  handleStatusChange(record.id, "attending")
                                }
                                title="Mark as attending"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={
                                  record.status === "not_attending"
                                    ? "destructive"
                                    : "ghost"
                                }
                                size="icon"
                                onClick={() =>
                                  handleStatusChange(record.id, "not_attending")
                                }
                                title="Mark as not attending"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={
                                  record.status === null ? "secondary" : "ghost"
                                }
                                size="icon"
                                onClick={() =>
                                  handleStatusChange(record.id, null)
                                }
                                title="Clear status"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an event from the list to mark attendance
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
