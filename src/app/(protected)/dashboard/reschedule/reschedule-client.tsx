"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CalendarClock, X } from "lucide-react";

interface Booking {
  id: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    cohorts?: { name: string; color: string } | { name: string; color: string }[] | null;
  } | {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    cohorts?: { name: string; color: string } | { name: string; color: string }[] | null;
  }[] | null;
}

// Helper to get first item from array or single object
function getFirst<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] || null : val;
}

interface RescheduleRequest {
  id: string;
  event_id: string;
  notes: string | null;
  status: string;
  requested_at: string;
  events: {
    title: string;
    start_time: string;
  } | {
    title: string;
    start_time: string;
  }[] | null;
}

interface RescheduleClientProps {
  bookings: Booking[];
  requests: RescheduleRequest[];
  submitRequest: (eventId: string, notes: string) => Promise<{ error?: string }>;
  cancelRequest: (requestId: string) => Promise<{ error?: string }>;
}

export function RescheduleClient({
  bookings,
  requests,
  submitRequest,
  cancelRequest,
}: RescheduleClientProps) {
  const [selectedEvent, setSelectedEvent] = useState<Booking | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const result = await submitRequest(selectedEvent.event_id, notes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Reschedule request submitted");
        setSelectedEvent(null);
        setNotes("");
      }
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Cancel this reschedule request?")) return;

    try {
      const result = await cancelRequest(requestId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Request cancelled");
      }
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  const pendingEventIds = requests.filter(r => r.status === "pending").map(r => r.event_id);

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    approved: "default",
    denied: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reschedule Requests</h1>
        <p className="text-muted-foreground">
          Request to reschedule your upcoming classes
        </p>
      </div>

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>
            Track the status of your reschedule requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reschedule requests yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Original Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const event = getFirst(request.events);
                  return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {event?.title}
                    </TableCell>
                    <TableCell>
                      {event?.start_time &&
                        format(new Date(event.start_time), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {request.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request New */}
      <Card>
        <CardHeader>
          <CardTitle>Request Reschedule</CardTitle>
          <CardDescription>
            Select an event to request a reschedule. A tutor or admin will review your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.filter(b => getFirst(b.events) && !pendingEventIds.includes(b.event_id)).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming events available for reschedule requests
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {bookings
                .filter(b => getFirst(b.events) && !pendingEventIds.includes(b.event_id))
                .map((booking) => {
                  const bEvent = getFirst(booking.events);
                  const cohort = getFirst(bEvent?.cohorts);
                  return (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedEvent(booking)}
                    className="flex items-center justify-between p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: cohort?.color || "#888" }}
                      />
                      <div>
                        <div className="font-medium">{bEvent?.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {bEvent?.start_time &&
                            format(new Date(bEvent.start_time), "EEE, MMM d · h:mm a")}
                        </div>
                      </div>
                    </div>
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  </button>
                );})}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
          </DialogHeader>
          {selectedEvent && (() => {
            const selEvent = getFirst(selectedEvent.events);
            if (!selEvent) return null;
            return (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium">{selEvent.title}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selEvent.start_time), "EEEE, MMMM d · h:mm a")}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Reason for reschedule</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Please explain why you need to reschedule..."
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background"
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Note: Submitting a request does not guarantee a reschedule.
                A tutor or admin will review and respond to your request.
              </p>
            </div>
          );})()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
