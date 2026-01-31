"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
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

interface AttendanceClientProps {
  events: EventWithAttendance[];
  cohorts: Cohort[];
  updateAttendance: (
    attendanceId: string,
    status: "attending" | "not_attending" | null
  ) => Promise<void>;
  createAttendance: (eventId: string, userId: string) => Promise<void>;
}

export function AttendanceClient({
  events,
  cohorts,
  updateAttendance,
}: AttendanceClientProps) {
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const filteredEvents =
    selectedCohort === "all"
      ? events
      : events.filter((e) => e.cohort_id === selectedCohort || e.program_id);

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
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">
          View and manage attendance records for all events
        </p>
      </div>

      <div className="flex gap-4">
        <Select
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
                const isPast = new Date(event.end_time) < new Date();
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
                      <span className="font-medium">{event.title}</span>
                      <Badge className={eventTypeColors[event.event_type]}>
                        {event.event_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), "MMM d, yyyy h:mm a")}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-green-600">
                        ✓ {stats.attending}
                      </span>
                      <span className="text-red-600">✗ {stats.notAttending}</span>
                      <span className="text-muted-foreground">
                        ? {stats.unmarked}
                      </span>
                      {isPast && stats.unmarked > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          Needs marking
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">No events found</p>
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
                  {currentEvent.programs && (
                    <span>{currentEvent.programs.name}</span>
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
                    No attendance records for this event
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
                              <Badge variant="success">Attending</Badge>
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
                Select an event to view and manage attendance
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
