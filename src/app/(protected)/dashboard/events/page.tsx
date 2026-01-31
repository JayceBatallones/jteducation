import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AppliedEventsClient } from "./events-client";

async function bookEvent(eventId: string) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Check if already booked
  const { data: existing } = await supabase
    .from("event_bookings")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (existing) throw new Error("Already booked");

  // Check capacity
  const { data: event } = await supabase
    .from("events")
    .select("capacity")
    .eq("id", eventId)
    .single();

  if (event?.capacity) {
    const { count } = await supabase
      .from("event_bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (count && count >= event.capacity) {
      throw new Error("Event is full");
    }
  }

  const { error } = await supabase.from("event_bookings").insert({
    user_id: user.id,
    event_id: eventId,
  });

  if (error) throw new Error(error.message);

  // Also create attendance record
  await supabase.from("attendance").insert({
    user_id: user.id,
    event_id: eventId,
    status: null,
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/schedule");
}

async function cancelBooking(eventId: string) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Check if event is within 24 hours
  const { data: event } = await supabase
    .from("events")
    .select("start_time")
    .eq("id", eventId)
    .single();

  if (event) {
    const hoursUntil =
      (new Date(event.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      throw new Error("Cannot cancel within 24 hours of event");
    }
  }

  const { error } = await supabase
    .from("event_bookings")
    .delete()
    .eq("user_id", user.id)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  // Also remove attendance record
  await supabase
    .from("attendance")
    .delete()
    .eq("user_id", user.id)
    .eq("event_id", eventId);

  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/schedule");
}

export default async function AppliedEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's cohort
  const { data: enrollment } = await supabase
    .from("cohort_students")
    .select("cohort_id, cohorts(program_id)")
    .eq("student_id", user.id)
    .single();

  const cohortId = enrollment?.cohort_id;
  const programId = (enrollment?.cohorts as { program_id?: string })?.program_id;

  // Get available applied events for user's cohort
  const { data: appliedEvents } = await supabase
    .from("events")
    .select(
      `
      *,
      cohorts (id, name, color),
      event_bookings (id, user_id)
    `
    )
    .eq("event_type", "applied")
    .eq("cohort_id", cohortId || "none")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  // Get user's current bookings
  const { data: userBookings } = await supabase
    .from("event_bookings")
    .select("event_id")
    .eq("user_id", user.id);

  const bookedEventIds = new Set(userBookings?.map((b) => b.event_id) || []);

  const events =
    appliedEvents?.map((event) => ({
      ...event,
      isBooked: bookedEventIds.has(event.id),
      bookedCount: event.event_bookings?.length || 0,
    })) || [];

  return (
    <AppliedEventsClient
      events={events}
      bookEvent={bookEvent}
      cancelBooking={cancelBooking}
    />
  );
}
