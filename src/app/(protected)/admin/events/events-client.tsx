"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Trash2, Clock } from "lucide-react";
import type { Event } from "@/types/database";

interface EventWithRelations extends Event {
  cohorts?: { id: string; name: string; color: string; programs?: { name: string } };
  programs?: { id: string; name: string };
}

interface Cohort {
  id: string;
  name: string;
  color: string;
  program_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programs: { name: string } | { name: string }[] | any;
}

interface Program {
  id: string;
  name: string;
}

interface EventsClientProps {
  events: EventWithRelations[];
  cohorts: Cohort[];
  programs: Program[];
  createEvent: (formData: FormData) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventTime: (id: string, startTime: string, endTime: string) => Promise<void>;
}

export function EventsClient({
  events,
  cohorts,
  programs,
  createEvent,
  deleteEvent,
  updateEventTime,
}: EventsClientProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState("content");
  const [editingEvent, setEditingEvent] = useState<EventWithRelations | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createEvent(formData);
      toast.success("Event created");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event? This will also delete all associated bookings and attendance records.")) {
      return;
    }
    try {
      await deleteEvent(id);
      toast.success("Event deleted");
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const handleUpdateTime = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const formData = new FormData(e.currentTarget);
      await updateEventTime(
        editingEvent.id,
        formData.get("start_time") as string,
        formData.get("end_time") as string
      );
      toast.success("Event time updated");
      setEditingEvent(null);
    } catch (error) {
      toast.error("Failed to update event time");
    }
  };

  const eventTypeColors: Record<string, string> = {
    content: "bg-blue-100 text-blue-800",
    applied: "bg-green-100 text-green-800",
    "drop-in": "bg-purple-100 text-purple-800",
    consult: "bg-orange-100 text-orange-800",
  };

  const daysOfWeek = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Create and manage class events (Content, Applied, Drop-in)
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="event_type">Event Type</Label>
                  <NativeSelect
                    id="event_type"
                    name="event_type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    options={[
                      { value: "content", label: "Content (Required)" },
                      { value: "applied", label: "Applied (Optional)" },
                      { value: "drop-in", label: "Drop-in (Program-wide)" },
                    ]}
                  />
                </div>

                {eventType !== "drop-in" ? (
                  <div className="space-y-2">
                    <Label htmlFor="cohort_id">Cohort</Label>
                    <NativeSelect
                      id="cohort_id"
                      name="cohort_id"
                      required
                      options={cohorts.map((c) => ({
                        value: c.id,
                        label: `${c.name} (${Array.isArray(c.programs) ? c.programs[0]?.name : c.programs?.name})`,
                      }))}
                      placeholder="Select cohort"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="program_id">Program</Label>
                    <NativeSelect
                      id="program_id"
                      name="program_id"
                      required
                      options={programs.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                      placeholder="Select program"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder={
                      eventType === "content"
                        ? "e.g., JMSS-Y10-1 Content"
                        : eventType === "applied"
                        ? "e.g., JMSS-Y10-1 Applied 1"
                        : "e.g., JMSS-Y10 Drop-in"
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input id="start_time" name="start_time" type="datetime-local" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input id="end_time" name="end_time" type="datetime-local" required />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Recurrence (Optional)</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_day">Day of Week</Label>
                      <NativeSelect
                        id="recurrence_day"
                        name="recurrence_day"
                        options={daysOfWeek}
                        placeholder="Select day"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_time">Time</Label>
                      <Input id="recurrence_time" name="recurrence_time" type="time" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="recurrence_end_date">End Date</Label>
                    <Input id="recurrence_end_date" name="recurrence_end_date" type="date" />
                  </div>
                </div>

                <input type="hidden" name="is_required" value={eventType === "content" ? "true" : "false"} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Time Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event Time</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTime}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_time">Start Time</Label>
                <Input
                  id="edit_start_time"
                  name="start_time"
                  type="datetime-local"
                  defaultValue={editingEvent?.start_time.slice(0, 16)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_end_time">End Time</Label>
                <Input
                  id="edit_end_time"
                  name="end_time"
                  type="datetime-local"
                  defaultValue={editingEvent?.end_time.slice(0, 16)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update Time</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events created yet. Create cohorts first, then add events.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cohort/Program</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge className={eventTypeColors[event.event_type]}>
                        {event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.cohorts ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.cohorts.color }}
                          />
                          {event.cohorts.name}
                        </div>
                      ) : (
                        event.programs?.name
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.start_time), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      {event.recurrence_pattern ? (
                        <span className="text-sm">
                          Every {(event.recurrence_pattern as { day: string }).day}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEvent(event)}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
