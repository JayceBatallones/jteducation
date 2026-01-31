import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TutorAttendanceClient } from "./attendance-client";

async function updateAttendance(
  attendanceId: string,
  status: "attending" | "not_attending" | null
) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance")
    .update({
      status,
      marked_by: user?.id || null,
      marked_at: new Date().toISOString(),
    })
    .eq("id", attendanceId);

  if (error) throw new Error(error.message);
  revalidatePath("/tutor/attendance");
}

export default async function TutorAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const params = await searchParams;

  // Get tutor's assigned cohorts
  const { data: cohortTutors } = await supabase
    .from("cohort_tutors")
    .select("cohort_id")
    .eq("tutor_id", user.id);

  const cohortIds = cohortTutors?.map((ct) => ct.cohort_id) || [];

  // Get events for tutor's cohorts with attendance
  const { data: events } = await supabase
    .from("events")
    .select(
      `
      *,
      cohorts (id, name, color),
      programs (id, name),
      attendance (
        id,
        user_id,
        status,
        marked_at,
        profiles:user_id (id, full_name, email)
      )
    `
    )
    .in("cohort_id", cohortIds.length > 0 ? cohortIds : ["none"])
    .order("start_time", { ascending: false })
    .limit(50);

  // Get cohorts for filter
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, color, programs(name)")
    .in("id", cohortIds.length > 0 ? cohortIds : ["none"]);

  return (
    <TutorAttendanceClient
      events={events || []}
      cohorts={cohorts || []}
      updateAttendance={updateAttendance}
      initialEventId={params.event}
    />
  );
}
