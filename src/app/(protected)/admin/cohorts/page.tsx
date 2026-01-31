import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CohortsClient } from "./cohorts-client";
import { getCohortColor } from "@/lib/utils";

async function createCohort(formData: FormData) {
  "use server";

  const supabase = await createClient();

  // Get existing cohort count for color assignment
  const { count } = await supabase
    .from("cohorts")
    .select("*", { count: "exact", head: true });

  const color = getCohortColor(count || 0);

  const { error } = await supabase.from("cohorts").insert({
    program_id: formData.get("program_id") as string,
    name: formData.get("name") as string,
    capacity: parseInt(formData.get("capacity") as string) || 10,
    color,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cohorts");
}

async function deleteCohort(id: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase.from("cohorts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cohorts");
}

async function assignTutor(cohortId: string, tutorId: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase.from("cohort_tutors").insert({
    cohort_id: cohortId,
    tutor_id: tutorId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cohorts");
}

async function removeTutor(cohortId: string, tutorId: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase
    .from("cohort_tutors")
    .delete()
    .eq("cohort_id", cohortId)
    .eq("tutor_id", tutorId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cohorts");
}

export default async function CohortsPage() {
  const supabase = await createClient();

  const [{ data: cohorts }, { data: programs }, { data: tutors }] = await Promise.all([
    supabase
      .from("cohorts")
      .select(`
        *,
        programs (name),
        cohort_tutors (
          tutor_id,
          profiles:tutor_id (full_name, email)
        ),
        cohort_students (count)
      `)
      .order("name"),
    supabase.from("programs").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "tutor"),
  ]);

  return (
    <CohortsClient
      cohorts={cohorts || []}
      programs={programs || []}
      tutors={tutors || []}
      createCohort={createCohort}
      deleteCohort={deleteCohort}
      assignTutor={assignTutor}
      removeTutor={removeTutor}
    />
  );
}
