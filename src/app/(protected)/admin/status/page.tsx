import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { StatusManagementClient } from "./status-client";

async function bulkUpdateStatus(userIds: string[], newStatus: string, reason: string) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  // Get current statuses for history
  const { data: users } = await supabase
    .from("profiles")
    .select("id, status")
    .in("id", userIds);

  if (!users) return { error: "No users found" };

  // Update statuses
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ status: newStatus })
    .in("id", userIds);

  if (updateError) return { error: updateError.message };

  // Log status changes
  const historyRecords = users.map((u) => ({
    user_id: u.id,
    old_status: u.status,
    new_status: newStatus,
    changed_by: user.id,
    reason,
  }));

  await supabase.from("user_status_history").insert(historyRecords);

  revalidatePath("/admin/status");
  return { success: true, count: userIds.length };
}

async function getPaymentPendingUsers() {
  "use server";

  const supabase = await createClient();

  // Get users who have been pending for more than 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: pendingUsers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, created_at")
    .eq("status", "pending_customer")
    .lt("created_at", fourteenDaysAgo.toISOString());

  return pendingUsers || [];
}

export default async function StatusManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  // Get all users with their status
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, created_at")
    .order("created_at", { ascending: false });

  // Get status counts
  const statusCounts = {
    customer: (users || []).filter((u) => u.status === "customer").length,
    pending_customer: (users || []).filter((u) => u.status === "pending_customer").length,
    inactive_customer: (users || []).filter((u) => u.status === "inactive_customer").length,
  };

  // Get recent status changes
  const { data: recentChanges } = await supabase
    .from("user_status_history")
    .select(`
      id,
      user_id,
      old_status,
      new_status,
      changed_at,
      reason,
      profiles:user_id (full_name, email),
      changed_by_profile:changed_by (full_name)
    `)
    .order("changed_at", { ascending: false })
    .limit(20);

  return (
    <StatusManagementClient
      users={users || []}
      statusCounts={statusCounts}
      recentChanges={recentChanges || []}
      bulkUpdateStatus={bulkUpdateStatus}
      getPaymentPendingUsers={getPaymentPendingUsers}
    />
  );
}
