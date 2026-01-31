"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Users } from "lucide-react";
import type { Event } from "@/types/database";

interface AppliedEvent extends Event {
  cohorts?: { id: string; name: string; color: string };
  isBooked: boolean;
  bookedCount: number;
}

interface AppliedEventsClientProps {
  events: AppliedEvent[];
  bookEvent: (eventId: string) => Promise<void>;
  cancelBooking: (eventId: string) => Promise<void>;
}

export function AppliedEventsClient({
  events,
  bookEvent,
  cancelBooking,
}: AppliedEventsClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBook = async (eventId: string) => {
    setLoading(eventId);
    try {
      await bookEvent(eventId);
      toast.success("Event booked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to book");
    }
    setLoading(null);
  };

  const handleCancel = async (eventId: string) => {
    if (!confirm("Cancel this booking?")) return;
    setLoading(eventId);
    try {
      await cancelBooking(eventId);
      toast.success("Booking cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    }
    setLoading(null);
  };

  const bookedEvents = events.filter((e) => e.isBooked);
  const availableEvents = events.filter((e) => !e.isBooked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applied Events</h1>
        <p className="text-muted-foreground">
          Browse and book optional applied sessions for your cohort
        </p>
      </div>

      {/* Your Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t booked any applied sessions yet
            </p>
          ) : (
            <div className="space-y-3">
              {bookedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ borderLeftWidth: "4px", borderLeftColor: event.cohorts?.color }}
                >
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">
                      <Check className="h-3 w-3 mr-1" />
                      Booked
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(event.id)}
                      disabled={loading === event.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Events */}
      <Card>
        <CardHeader>
          <CardTitle>Available Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {availableEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No available applied sessions at the moment
            </p>
          ) : (
            <div className="space-y-3">
              {availableEvents.map((event) => {
                const isFull = !!(event.capacity && event.bookedCount >= event.capacity);
                const spotsLeft = event.capacity
                  ? event.capacity - event.bookedCount
                  : null;

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ borderLeftWidth: "4px", borderLeftColor: event.cohorts?.color }}
                  >
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
                      </div>
                      {spotsLeft !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Users className="h-3 w-3" />
                          {isFull ? (
                            <span className="text-destructive">Full</span>
                          ) : (
                            <span>{spotsLeft} spots left</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleBook(event.id)}
                      disabled={loading === event.id || isFull}
                      size="sm"
                    >
                      {loading === event.id ? "Booking..." : "Book"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
