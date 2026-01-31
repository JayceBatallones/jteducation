"use client";

import { useState } from "react";
import { format, isBefore, addHours } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, User, X } from "lucide-react";

interface ConsultSlot {
  id: string;
  tutor_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
}

// Helper to get first item from array or single object
function getFirst<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] || null : val;
}

interface MyBooking {
  id: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
  } | {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
  }[];
}

interface ConsultsClientProps {
  availableSlots: ConsultSlot[];
  myBookings: MyBooking[];
  bookConsult: (slotId: string) => Promise<{ error?: string }>;
  cancelConsult: (bookingId: string, eventId: string) => Promise<{ error?: string }>;
}

export function ConsultsClient({
  availableSlots,
  myBookings,
  bookConsult,
  cancelConsult,
}: ConsultsClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBook = async (slotId: string) => {
    setLoading(slotId);
    try {
      const result = await bookConsult(slotId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Consult booked!");
      }
    } catch {
      toast.error("Failed to book consult");
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async (bookingId: string, eventId: string) => {
    if (!confirm("Are you sure you want to cancel this consult?")) return;

    setLoading(bookingId);
    try {
      const result = await cancelConsult(bookingId, eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Consult cancelled");
      }
    } catch {
      toast.error("Failed to cancel consult");
    } finally {
      setLoading(null);
    }
  };

  const canCancel = (startTime: string) => {
    return isBefore(new Date(), addHours(new Date(startTime), -24));
  };

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    const date = format(new Date(slot.start_time), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, ConsultSlot[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consult Booking</h1>
        <p className="text-muted-foreground">
          Book one-on-one sessions with tutors
        </p>
      </div>

      {/* My Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>My Upcoming Consults</CardTitle>
          <CardDescription>
            Your booked consultation sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming consults booked
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myBookings.map((booking) => {
                  const event = getFirst(booking.events);
                  if (!event) return null;
                  return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {event.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(event.start_time), "EEE, MMM d")}
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                        {format(new Date(event.start_time), "h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Math.round(
                        (new Date(event.end_time).getTime() -
                          new Date(event.start_time).getTime()) /
                          (1000 * 60)
                      )}{" "}
                      min
                    </TableCell>
                    <TableCell>
                      {canCancel(event.start_time) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(booking.id, event.id)}
                          disabled={loading === booking.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant="secondary">Within 24hrs</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Available Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Available Slots</CardTitle>
          <CardDescription>
            Book a consultation session (up to 4 weeks in advance)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(slotsByDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No available slots at the moment. Check back later.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(slotsByDate).map(([date, slots]) => (
                <div key={date}>
                  <h3 className="font-medium mb-3">
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">
                              {format(new Date(slot.start_time), "h:mm a")} -{" "}
                              {format(new Date(slot.end_time), "h:mm a")}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getFirst(slot.profiles)?.full_name || "Tutor"}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBook(slot.id)}
                          disabled={loading === slot.id}
                        >
                          {loading === slot.id ? "Booking..." : "Book"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Cancellation Policy:</strong> Consults can be cancelled up to 24 hours before the scheduled time.
            Late cancellations or no-shows may affect your booking privileges.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
