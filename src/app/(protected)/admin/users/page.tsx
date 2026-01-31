import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { UsersClient } from "./users-client";

async function createUser(formData: FormData) {
  "use server";

  const supabase = await createAdminClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;
  const timezone = formData.get("timezone") as string || "Australia/Melbourne";

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });

  if (authError) throw new Error(authError.message);

  // Update profile with additional info
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      timezone,
      role: role as "parent" | "student" | "tutor" | "admin",
      status: "customer",
    })
    .eq("id", authData.user.id);

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/admin/users");
}

async function createParentStudentPair(formData: FormData) {
  "use server";

  const supabase = await createAdminClient();

  const parentEmail = formData.get("parent_email") as string;
  const parentPassword = formData.get("parent_password") as string;
  const parentName = formData.get("parent_name") as string;

  const studentEmail = formData.get("student_email") as string;
  const studentPassword = formData.get("student_password") as string;
  const studentName = formData.get("student_name") as string;

  const timezone = formData.get("timezone") as string || "Australia/Melbourne";

  // Create parent
  const { data: parentAuth, error: parentAuthError } = await supabase.auth.admin.createUser({
    email: parentEmail,
    password: parentPassword,
    email_confirm: true,
    user_metadata: { role: "parent" },
  });

  if (parentAuthError) throw new Error(`Parent creation failed: ${parentAuthError.message}`);

  await supabase
    .from("profiles")
    .update({
      full_name: parentName,
      timezone,
      role: "parent",
      status: "customer",
    })
    .eq("id", parentAuth.user.id);

  // Create student
  const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
    email: studentEmail,
    password: studentPassword,
    email_confirm: true,
    user_metadata: { role: "student" },
  });

  if (studentAuthError) throw new Error(`Student creation failed: ${studentAuthError.message}`);

  await supabase
    .from("profiles")
    .update({
      full_name: studentName,
      timezone,
      role: "student",
      status: "customer",
    })
    .eq("id", studentAuth.user.id);

  // Link parent to student
  const { error: linkError } = await supabase
    .from("parent_student_links")
    .insert({
      parent_id: parentAuth.user.id,
      student_id: studentAuth.user.id,
    });

  if (linkError) throw new Error(`Link creation failed: ${linkError.message}`);

  revalidatePath("/admin/users");
}

async function enrollStudent(studentId: string, cohortId: string) {
  "use server";

  const supabase = await createAdminClient();

  const { error } = await supabase.from("cohort_students").insert({
    student_id: studentId,
    cohort_id: cohortId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

async function unenrollStudent(studentId: string, cohortId: string) {
  "use server";

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("cohort_students")
    .delete()
    .eq("student_id", studentId)
    .eq("cohort_id", cohortId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

async function updateUserStatus(userId: string, status: string) {
  "use server";

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: status as "customer" | "inactive_customer" | "pending_customer" })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: cohorts }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        *,
        cohort_students (
          cohort_id,
          cohorts (id, name, color)
        ),
        parent_student_links!parent_student_links_parent_id_fkey (
          student_id,
          profiles:student_id (id, full_name, email)
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("cohorts").select(`
      id, name, color, program_id, capacity, stable_meet_link,
      programs(name),
      cohort_students(count),
      events(id, title, start_time, event_type)
    `),
  ]);

  // Transform cohorts to include student count
  const cohortsWithCount = (cohorts || []).map((c: {
    id: string;
    name: string;
    color: string;
    program_id: string;
    capacity: number | null;
    stable_meet_link: string | null;
    programs: { name: string } | { name: string }[] | null;
    cohort_students: { count: number }[] | null;
    events: { id: string; title: string; start_time: string; event_type: string }[] | null;
  }) => ({
    ...c,
    _count: { cohort_students: c.cohort_students?.[0]?.count || 0 },
  }));

  return (
    <UsersClient
      users={users || []}
      cohorts={cohortsWithCount}
      createUser={createUser}
      createParentStudentPair={createParentStudentPair}
      enrollStudent={enrollStudent}
      unenrollStudent={unenrollStudent}
      updateUserStatus={updateUserStatus}
    />
  );
}
