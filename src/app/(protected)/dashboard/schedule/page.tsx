import { createClient } from "@/lib/supabase/server";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get all events the user is booked into
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select(
      `
      id,
      events (
        id,
        title,
        start_time,
        end_time,
        event_type,
        is_required,
        cohorts (id, name, color),
        programs (id, name)
      )
    `
    )
    .eq("user_id", user.id);

  // Get attendance records for these events
  const eventIds = bookings?.map((b) => (b.events as unknown as { id: string })?.id).filter(Boolean) || [];
  const { data: attendance } = await supabase
    .from("attendance")
    .select("event_id, status")
    .eq("user_id", user.id)
    .in("event_id", eventIds.length > 0 ? eventIds : ["none"]);

  const attendanceMap = new Map(
    attendance?.map((a) => [a.event_id, a.status]) || []
  );

  const events =
    bookings
      ?.map((booking) => {
        const event = booking.events as unknown as {
          id: string;
          title: string;
          start_time: string;
          end_time: string;
          event_type: string;
          is_required: boolean;
          cohorts?: { id: string; name: string; color: string };
          programs?: { id: string; name: string };
        };
        if (!event) return null;

        return {
          id: event.id,
          title: event.title,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          eventType: event.event_type,
          isRequired: event.is_required,
          color: event.cohorts?.color || "#6366f1",
          cohortName: event.cohorts?.name,
          programName: event.programs?.name,
          attendanceStatus: attendanceMap.get(event.id) || null,
        };
      })
      .filter(Boolean) || [];

  return <ScheduleClient events={events as NonNullable<(typeof events)[0]>[]} />;
}
