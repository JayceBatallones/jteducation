import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AttendanceClient } from "./attendance-client";

async function updateAttendance(
  attendanceId: string,
  status: "attending" | "not_attending" | null
) {
  "use server";

  const supabase = await createAdminClient();
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
  revalidatePath("/admin/attendance");
}

async function createAttendance(eventId: string, userId: string) {
  "use server";

  const supabase = await createAdminClient();

  const { error } = await supabase.from("attendance").insert({
    event_id: eventId,
    user_id: userId,
    status: null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/attendance");
}

export default async function AttendancePage() {
  const supabase = await createClient();

  const [{ data: events }, { data: cohorts }] = await Promise.all([
    supabase
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
      .order("start_time", { ascending: false })
      .limit(50),
    supabase.from("cohorts").select("id, name, color, programs(name)"),
  ]);

  return (
    <AttendanceClient
      events={events || []}
      cohorts={cohorts || []}
      updateAttendance={updateAttendance}
      createAttendance={createAttendance}
    />
  );
}
