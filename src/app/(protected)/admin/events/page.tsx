import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EventsClient } from "./events-client";

async function createEvent(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const eventType = formData.get("event_type") as string;
  const cohortId = formData.get("cohort_id") as string;
  const programId = formData.get("program_id") as string;
  const title = formData.get("title") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const isRequired = formData.get("is_required") === "true";

  const recurrenceDay = formData.get("recurrence_day") as string;
  const recurrenceTime = formData.get("recurrence_time") as string;
  const recurrenceEndDate = formData.get("recurrence_end_date") as string;

  const { error } = await supabase.from("events").insert({
    cohort_id: eventType !== "drop-in" ? cohortId : null,
    program_id: eventType === "drop-in" ? programId : null,
    title,
    start_time: startTime,
    end_time: endTime,
    event_type: eventType as "content" | "applied" | "drop-in",
    is_required: eventType === "content" ? true : isRequired,
    recurrence_pattern: recurrenceDay
      ? { day: recurrenceDay, time: recurrenceTime, freq: "weekly" }
      : null,
    recurrence_end_date: recurrenceEndDate || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
}

async function deleteEvent(id: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
}

async function updateEventTime(id: string, startTime: string, endTime: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ start_time: startTime, end_time: endTime })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
}

export default async function EventsPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: cohorts }, { data: programs }] = await Promise.all([
    supabase
      .from("events")
      .select(`
        *,
        cohorts (id, name, color, programs(name)),
        programs (id, name)
      `)
      .order("start_time", { ascending: true }),
    supabase.from("cohorts").select("id, name, color, program_id, programs(name)"),
    supabase.from("programs").select("id, name"),
  ]);

  return (
    <EventsClient
      events={events || []}
      cohorts={cohorts || []}
      programs={programs || []}
      createEvent={createEvent}
      deleteEvent={deleteEvent}
      updateEventTime={updateEventTime}
    />
  );
}
