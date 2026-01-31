import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FEATURE_FLAGS } from "@/lib/utils";
import { RescheduleClient } from "./reschedule-client";

async function submitRequest(eventId: string, notes: string) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if request already exists
  const { data: existing } = await supabase
    .from("reschedule_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .eq("status", "pending")
    .single();

  if (existing) {
    return { error: "You already have a pending request for this event" };
  }

  const { error } = await supabase
    .from("reschedule_requests")
    .insert({
      user_id: user.id,
      event_id: eventId,
      notes,
      status: "pending",
    });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reschedule");
  return {};
}

async function cancelRequest(requestId: string) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("reschedule_requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reschedule");
  return {};
}

export default async function ReschedulePage() {
  // Check feature flag
  if (!FEATURE_FLAGS.ENABLE_RESCHEDULE) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's upcoming booked events
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select(`
      id,
      event_id,
      events (
        id,
        title,
        start_time,
        end_time,
        event_type,
        cohorts (name, color)
      )
    `)
    .eq("user_id", user.id)
    .gte("events.start_time", new Date().toISOString())
    .order("events(start_time)", { ascending: true });

  // Get user's reschedule requests
  const { data: requests } = await supabase
    .from("reschedule_requests")
    .select(`
      id,
      event_id,
      notes,
      status,
      requested_at,
      events (
        title,
        start_time
      )
    `)
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  return (
    <RescheduleClient
      bookings={bookings || []}
      requests={requests || []}
      submitRequest={submitRequest}
      cancelRequest={cancelRequest}
    />
  );
}
