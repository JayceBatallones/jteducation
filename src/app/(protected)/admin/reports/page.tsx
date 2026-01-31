import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
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

  // Get cohort attendance stats
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select(`
      id,
      name,
      color,
      capacity,
      programs (name)
    `);

  // Get attendance data per cohort
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select(`
      status,
      events!inner (
        id,
        cohort_id,
        start_time
      )
    `)
    .not("events.cohort_id", "is", null) as { data: { status: string; events: { id: string; cohort_id: string; start_time: string } | { id: string; cohort_id: string; start_time: string }[] }[] | null };

  // Get enrollment counts
  const { data: enrollments } = await supabase
    .from("cohort_students")
    .select("cohort_id");

  // Get upcoming events count
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, cohort_id")
    .gte("start_time", new Date().toISOString());

  // Get user status counts
  const { data: userStatuses } = await supabase
    .from("profiles")
    .select("status, role");

  // Calculate cohort stats
  const cohortStats = (cohorts || []).map((cohort) => {
    const cohortId = cohort.id;
    const enrolled = (enrollments || []).filter(e => e.cohort_id === cohortId).length;
    const cohortAttendance = (attendanceData || []).filter(
      a => a.events && (Array.isArray(a.events) ? a.events[0]?.cohort_id : a.events.cohort_id) === cohortId
    );
    const attended = cohortAttendance.filter(a => a.status === "attending").length;
    const total = cohortAttendance.length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
    const program = Array.isArray(cohort.programs) ? cohort.programs[0] : cohort.programs;

    return {
      id: cohortId,
      name: cohort.name,
      color: cohort.color,
      program: program?.name || "Unknown",
      capacity: cohort.capacity,
      enrolled,
      utilization: cohort.capacity > 0 ? Math.round((enrolled / cohort.capacity) * 100) : 0,
      attendanceRate,
      upcomingEvents: (upcomingEvents || []).filter(e => e.cohort_id === cohortId).length,
    };
  });

  // Calculate overall stats
  const totalStudents = (userStatuses || []).filter(u => u.role === "student").length;
  const activeStudents = (userStatuses || []).filter(u => u.role === "student" && u.status === "customer").length;
  const pendingStudents = (userStatuses || []).filter(u => u.role === "student" && u.status === "pending_customer").length;
  const totalAttendance = (attendanceData || []).length;
  const totalAttended = (attendanceData || []).filter(a => a.status === "attending").length;
  const overallAttendanceRate = totalAttendance > 0 ? Math.round((totalAttended / totalAttendance) * 100) : 0;

  const overallStats = {
    totalStudents,
    activeStudents,
    pendingStudents,
    inactiveStudents: totalStudents - activeStudents - pendingStudents,
    overallAttendanceRate,
    totalCohorts: cohortStats.length,
    avgUtilization: cohortStats.length > 0
      ? Math.round(cohortStats.reduce((sum, c) => sum + c.utilization, 0) / cohortStats.length)
      : 0,
  };

  return (
    <ReportsClient
      cohortStats={cohortStats}
      overallStats={overallStats}
    />
  );
}
