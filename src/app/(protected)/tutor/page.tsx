import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock } from "lucide-react";
import Link from "next/link";

export default async function TutorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get tutor's assigned cohorts
  const { data: cohortTutors } = await supabase
    .from("cohort_tutors")
    .select(`
      cohort_id,
      cohorts (
        id,
        name,
        color,
        program_id,
        programs (name)
      )
    `)
    .eq("tutor_id", user?.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cohorts = cohortTutors?.map((ct) => ct.cohorts as unknown as { id: string; name: string; color: string; program_id: string; programs?: { name: string } }) || [];

  // Get upcoming events for tutor's cohorts
  const cohortIds = cohorts.map((c) => c?.id).filter(Boolean);
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("*")
    .in("cohort_id", cohortIds.length > 0 ? cohortIds : [""])
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tutor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your availability and mark attendance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Cohorts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cohorts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Availability
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href="/tutor/availability" className="text-primary hover:underline text-sm">
              Set your availability →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            {cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cohorts assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {cohorts.map((cohort) => (
                  <div
                    key={cohort?.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cohort?.color }}
                    />
                    <div>
                      <div className="font-medium">{cohort?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(cohort as { programs?: { name: string } })?.programs?.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {!upcomingEvents || upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/tutor/attendance?event=${event.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.start_time).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
