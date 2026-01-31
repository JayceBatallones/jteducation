"use client";

import { useState, useMemo } from "react";
import { format, isPast, isFuture, isToday } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, Clock } from "lucide-react";
import type { Event } from "@/types/database";

interface EventWithRelations extends Event {
  cohorts?: {
    id: string;
    name: string;
    color: string;
    programs?: { name: string };
  };
  attendance?: { id: string; status: string | null }[];
}

interface Cohort {
  id: string;
  name: string;
  color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programs?: { name: string } | { name: string }[] | any;
}

interface TutorEventsClientProps {
  events: EventWithRelations[];
  cohorts: Cohort[];
  updateEventTime: (eventId: string, startTime: string, endTime: string) => Promise<{ error?: string }>;
}

export function TutorEventsClient({ events, cohorts, updateEventTime }: TutorEventsClientProps) {
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("upcoming");
  const [rescheduleEvent, setRescheduleEvent] = useState<EventWithRelations | null>(null);
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const openReschedule = (event: EventWithRelations) => {
    setRescheduleEvent(event);
    // Format for datetime-local input
    setNewStartTime(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
    setNewEndTime(format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"));
  };

  const handleReschedule = async () => {
    if (!rescheduleEvent) return;
    setLoading(true);
    try {
      const result = await updateEventTime(rescheduleEvent.id, newStartTime, newEndTime);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Event time updated");
        setRescheduleEvent(null);
      }
    } catch {
      toast.error("Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Cohort filter
      if (selectedCohort !== "all" && event.cohort_id !== selectedCohort) {
        return false;
      }

      // Time filter
      const eventDate = new Date(event.start_time);
      if (timeFilter === "upcoming" && !isFuture(eventDate) && !isToday(eventDate)) {
        return false;
      }
      if (timeFilter === "past" && !isPast(eventDate)) {
        return false;
      }
      if (timeFilter === "today" && !isToday(eventDate)) {
        return false;
      }

      return true;
    });
  }, [events, selectedCohort, timeFilter]);

  const eventTypeColors: Record<string, string> = {
    content: "bg-blue-100 text-blue-800",
    applied: "bg-green-100 text-green-800",
    "drop-in": "bg-purple-100 text-purple-800",
    consult: "bg-orange-100 text-orange-800",
  };

  const getAttendanceStats = (attendance?: { status: string | null }[]) => {
    if (!attendance) return { marked: 0, total: 0 };
    const marked = attendance.filter((a) => a.status !== null).length;
    return { marked, total: attendance.length };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="text-muted-foreground">
          View and manage events for your cohorts
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
          className="w-[200px]"
        />
        <Select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          options={[
            { value: "all", label: "All Time" },
            { value: "today", label: "Today" },
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
          className="w-[150px]"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const stats = getAttendanceStats(event.attendance);
                  const eventDate = new Date(event.start_time);
                  const isPastEvent = isPast(new Date(event.end_time));

                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.cohorts?.color }}
                          />
                          <div>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.cohorts?.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={eventTypeColors[event.event_type]}>
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{format(eventDate, "EEE, MMM d")}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(eventDate, "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {stats.marked}/{stats.total} marked
                        </div>
                        {isPastEvent && stats.marked < stats.total && (
                          <Badge variant="destructive" className="text-xs">
                            Incomplete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/tutor/attendance?event=${event.id}`}>
                            <Button variant="ghost" size="sm" title="Mark attendance">
                              <ClipboardCheck className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reschedule"
                            onClick={() => openReschedule(event)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleEvent} onOpenChange={(open) => !open && setRescheduleEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Event</DialogTitle>
          </DialogHeader>
          {rescheduleEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: rescheduleEvent.cohorts?.color }}
                />
                <div>
                  <div className="font-medium">{rescheduleEvent.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {rescheduleEvent.cohorts?.name}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Changing the event time will affect all enrolled students.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={loading}>
              {loading ? "Updating..." : "Update Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
