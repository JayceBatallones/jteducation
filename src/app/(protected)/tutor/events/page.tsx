import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TutorEventsClient } from "./events-client";

async function updateEventTime(eventId: string, startTime: string, endTime: string) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Validate that tutor is assigned to this event's cohort
  const { data: event } = await supabase
    .from("events")
    .select("cohort_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return { error: "Event not found" };
  }

  const { data: assignment } = await supabase
    .from("cohort_tutors")
    .select("id")
    .eq("tutor_id", user.id)
    .eq("cohort_id", event.cohort_id)
    .single();

  if (!assignment) {
    return { error: "Not authorized to modify this event" };
  }

  // Update the event time
  const { error } = await supabase
    .from("events")
    .update({
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tutor/events");
  return {};
}

export default async function TutorEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get tutor's assigned cohorts
  const { data: cohortTutors } = await supabase
    .from("cohort_tutors")
    .select("cohort_id")
    .eq("tutor_id", user.id);

  const cohortIds = cohortTutors?.map((ct) => ct.cohort_id) || [];

  // Get events for tutor's cohorts
  const { data: events } = await supabase
    .from("events")
    .select(
      `
      *,
      cohorts (id, name, color, programs(name)),
      attendance (id, status)
    `
    )
    .in("cohort_id", cohortIds.length > 0 ? cohortIds : ["none"])
    .order("start_time", { ascending: true });

  // Get cohorts for filter
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, color, programs(name)")
    .in("id", cohortIds.length > 0 ? cohortIds : ["none"]);

  return (
    <TutorEventsClient
      events={events || []}
      cohorts={cohorts || []}
      updateEventTime={updateEventTime}
    />
  );
}
