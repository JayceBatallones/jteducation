import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { WaitlistClient } from "./waitlist-client";

async function removeFromWaitlist(waitlistId: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase
    .from("cohort_waitlist")
    .delete()
    .eq("id", waitlistId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/waitlist");
}

async function placeStudent(studentId: string, cohortId: string, waitlistId: string) {
  "use server";

  const supabase = await createClient();

  // Enroll student in cohort
  const { error: enrollError } = await supabase
    .from("cohort_students")
    .insert({ student_id: studentId, cohort_id: cohortId });

  if (enrollError) throw new Error(enrollError.message);

  // Remove from waitlist
  await supabase.from("cohort_waitlist").delete().eq("id", waitlistId);

  // Update student status to customer
  await supabase
    .from("profiles")
    .update({ status: "customer" })
    .eq("id", studentId);

  revalidatePath("/admin/waitlist");
  revalidatePath("/admin/users");
}

export default async function WaitlistPage() {
  const supabase = await createClient();

  // Get waitlisted users with their details
  const { data: waitlist } = await supabase
    .from("cohort_waitlist")
    .select(`
      id,
      notes,
      waitlisted_at,
      program_id,
      user_id,
      profiles:user_id (
        id,
        full_name,
        email,
        status
      ),
      programs:program_id (
        id,
        name
      )
    `)
    .order("waitlisted_at", { ascending: true });

  // Get all cohorts for placement
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select(`
      id,
      name,
      color,
      capacity,
      program_id,
      programs (name),
      cohort_students (count)
    `);

  const cohortsWithCount = (cohorts || []).map((c: {
    id: string;
    name: string;
    color: string;
    capacity: number;
    program_id: string;
    programs: { name: string } | { name: string }[] | null;
    cohort_students: { count: number }[] | null;
  }) => ({
    ...c,
    programs: Array.isArray(c.programs) ? c.programs[0] : c.programs,
    enrolled: c.cohort_students?.[0]?.count || 0,
  }));

  return (
    <WaitlistClient
      waitlist={waitlist || []}
      cohorts={cohortsWithCount}
      removeFromWaitlist={removeFromWaitlist}
      placeStudent={placeStudent}
    />
  );
}
