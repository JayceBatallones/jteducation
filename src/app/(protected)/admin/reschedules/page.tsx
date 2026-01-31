import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ReschedulesClient } from "./reschedules-client";

async function handleRequest(
  requestId: string,
  action: "approved" | "denied",
  adminNotes: string
) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify admin/tutor role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "tutor"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("reschedule_requests")
    .update({
      status: action,
      admin_notes: adminNotes || null,
      handled_by: user.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  revalidatePath("/admin/reschedules");
  return {};
}

export default async function AdminReschedulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify admin/tutor role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "tutor"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Get all reschedule requests
  const { data: requests } = await supabase
    .from("reschedule_requests")
    .select(`
      id,
      event_id,
      user_id,
      notes,
      status,
      requested_at,
      admin_notes,
      events (
        id,
        title,
        start_time,
        end_time
      ),
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order("requested_at", { ascending: false });

  return (
    <ReschedulesClient
      requests={requests || []}
      handleRequest={handleRequest}
    />
  );
}
