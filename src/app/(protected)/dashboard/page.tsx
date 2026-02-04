import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { UpcomingClasses } from "./dashboard-client";
import { revalidatePath } from "next/cache";

async function updateAttendance(eventId: string, status: "attending" | "not_attending") {
  "use server";

  const supabase = await createClient();
  const { user } = await getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if attendance record exists
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("attendance")
      .update({ status, marked_at: new Date().toISOString(), marked_by: user.id })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("attendance")
      .insert({
        user_id: user.id,
        event_id: eventId,
        status,
        marked_at: new Date().toISOString(),
        marked_by: user.id,
      });

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard");
  return {};
}

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { user } = await getUser();

  if (!user) return null;

  // Get student's cohort enrollment
  const { data: enrollment } = await supabase
    .from("cohort_students")
    .select(`
      cohort_id,
      cohorts (
        id,
        name,
        color,
        programs (name)
      )
    `)
    .eq("student_id", user.id)
    .single();

  const cohort = enrollment?.cohorts as unknown as { id: string; name: string; color: string; programs?: { name: string } } | null;

  // Get upcoming events with attendance status
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select(`
      id,
      event_id,
      events (
        id,
        title,
        start_time,
        end_time,
        event_type,
        cohorts (name, color)
      )
    `)
    .eq("user_id", user.id)
    .gte("events.start_time", new Date().toISOString())
    .order("events(start_time)", { ascending: true })
    .limit(5);

  // Get attendance for these events
  const eventIds = bookings?.map(b => b.event_id).filter(Boolean) || [];
  const { data: attendanceRecords } = await supabase
    .from("attendance")
    .select("id, event_id, status")
    .eq("user_id", user.id)
    .in("event_id", eventIds.length > 0 ? eventIds : ["none"]);

  // Merge attendance into bookings
  const bookingsWithAttendance = bookings?.map(booking => ({
    ...booking,
    events: booking.events as unknown as {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      event_type: string;
      cohorts?: { name: string; color: string } | null;
    } | null,
    attendance: attendanceRecords?.find(a => a.event_id === booking.event_id) || null,
  })) || [];

  // Get attendance stats
  const { data: attendanceStats } = await supabase
    .from("attendance")
    .select("status")
    .eq("user_id", user.id);

  const attended = attendanceStats?.filter((a) => a.status === "attending").length || 0;
  const total = attendanceStats?.length || 0;
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s your schedule overview.
        </p>
      </div>

      {/* Cohort Info */}
      {cohort && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: cohort.color }}
            />
            <div>
              <CardTitle>{cohort.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {cohort?.programs?.name}
              </p>
            </div>
          </CardHeader>
        </Card>
      )}

      {!cohort && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You are not enrolled in any cohort yet. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Classes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applied Events
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events" className="text-primary hover:underline text-sm">
              Browse events →
            </Link>
          </CardContent>
        </Card>
      </div>

      <UpcomingClasses
        bookings={bookingsWithAttendance}
        updateAttendance={updateAttendance}
      />
    </div>
  );
}
