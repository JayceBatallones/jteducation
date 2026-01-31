import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FEATURE_FLAGS } from "@/lib/utils";
import { ConsultsClient } from "./consults-client";

async function bookConsult(slotId: string) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get the slot details
  const { data: slot } = await supabase
    .from("consult_slots")
    .select("*, profiles:tutor_id (full_name)")
    .eq("id", slotId)
    .single();

  if (!slot) return { error: "Slot not found" };
  if (slot.is_booked) return { error: "Slot is already booked" };

  // Create a consult event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title: `Consult with ${slot.profiles?.full_name || "Tutor"}`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      event_type: "consult",
      capacity: 1,
    })
    .select()
    .single();

  if (eventError) return { error: eventError.message };

  // Create booking
  const { error: bookingError } = await supabase
    .from("event_bookings")
    .insert({
      user_id: user.id,
      event_id: event.id,
    });

  if (bookingError) return { error: bookingError.message };

  // Mark slot as booked
  await supabase
    .from("consult_slots")
    .update({ is_booked: true, booked_by: user.id, event_id: event.id })
    .eq("id", slotId);

  revalidatePath("/dashboard/consults");
  return {};
}

async function cancelConsult(bookingId: string, eventId: string) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get the event to check timing
  const { data: event } = await supabase
    .from("events")
    .select("start_time")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };

  // Check 24-hour cancellation policy
  const hoursUntilStart = (new Date(event.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilStart < 24) {
    return { error: "Cannot cancel within 24 hours of the consult" };
  }

  // Delete booking
  const { error: bookingError } = await supabase
    .from("event_bookings")
    .delete()
    .eq("id", bookingId)
    .eq("user_id", user.id);

  if (bookingError) return { error: bookingError.message };

  // Free up the slot
  await supabase
    .from("consult_slots")
    .update({ is_booked: false, booked_by: null, event_id: null })
    .eq("event_id", eventId);

  // Delete the event
  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath("/dashboard/consults");
  return {};
}

export default async function ConsultsPage() {
  // Check feature flag
  if (!FEATURE_FLAGS.ENABLE_CONSULTS) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get available consult slots (next 4 weeks)
  const { data: slots } = await supabase
    .from("consult_slots")
    .select(`
      id,
      tutor_id,
      start_time,
      end_time,
      is_booked,
      profiles:tutor_id (full_name)
    `)
    .eq("is_booked", false)
    .gte("start_time", new Date().toISOString())
    .lte("start_time", new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString())
    .order("start_time", { ascending: true });

  // Get user's booked consults
  const { data: myBookings } = await supabase
    .from("event_bookings")
    .select(`
      id,
      event_id,
      events!inner (
        id,
        title,
        start_time,
        end_time,
        event_type
      )
    `)
    .eq("user_id", user.id)
    .eq("events.event_type", "consult")
    .gte("events.start_time", new Date().toISOString());

  return (
    <ConsultsClient
      availableSlots={slots || []}
      myBookings={myBookings || []}
      bookConsult={bookConsult}
      cancelConsult={cancelConsult}
    />
  );
}
