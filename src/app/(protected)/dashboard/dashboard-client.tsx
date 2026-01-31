"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface BookingWithEvent {
  id: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    cohorts?: { name: string; color: string } | null;
  } | null;
  attendance?: {
    id: string;
    status: "attending" | "not_attending" | null;
  } | null;
}

interface UpcomingClassesProps {
  bookings: BookingWithEvent[];
  updateAttendance: (
    eventId: string,
    status: "attending" | "not_attending"
  ) => Promise<{ error?: string }>;
}

export function UpcomingClasses({ bookings, updateAttendance }: UpcomingClassesProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, "attending" | "not_attending" | null>>({});

  const handleStatusChange = async (eventId: string, status: "attending" | "not_attending") => {
    setLoadingId(eventId);
    try {
      const result = await updateAttendance(eventId, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        setLocalStatuses(prev => ({ ...prev, [eventId]: status }));
        toast.success(status === "attending" ? "Marked as attending" : "Marked as not attending");
      }
    } catch {
      toast.error("Failed to update attendance");
    } finally {
      setLoadingId(null);
    }
  };

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No upcoming classes scheduled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Classes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bookings.map((booking) => {
            const event = booking.events;
            if (!event) return null;

            const currentStatus = localStatuses[event.id] ?? booking.attendance?.status;
            const isLoading = loadingId === event.id;

            return (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: event.cohorts?.color || "#888" }}
                  />
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={event.event_type === "content" ? "default" : "secondary"}>
                    {event.event_type}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant={currentStatus === "attending" ? "default" : "outline"}
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleStatusChange(event.id, "attending")}
                      title="I'll be attending"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={currentStatus === "not_attending" ? "destructive" : "outline"}
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleStatusChange(event.id, "not_attending")}
                      title="Not attending"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
