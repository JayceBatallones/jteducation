import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Calendar, BookOpen } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Get counts for dashboard stats
  const [
    { count: userCount },
    { count: programCount },
    { count: cohortCount },
    { count: eventCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("programs").select("*", { count: "exact", head: true }),
    supabase.from("cohorts").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total Users", value: userCount || 0, icon: Users },
    { label: "Programs", value: programCount || 0, icon: BookOpen },
    { label: "Cohorts", value: cohortCount || 0, icon: GraduationCap },
    { label: "Events", value: eventCount || 0, icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage programs, cohorts, events, and users
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/users"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Create User</div>
              <div className="text-sm text-muted-foreground">
                Add a new parent/student account
              </div>
            </a>
            <a
              href="/admin/programs"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Manage Programs</div>
              <div className="text-sm text-muted-foreground">
                Create or edit programs (JMSS-Y10, JMSS-Y11)
              </div>
            </a>
            <a
              href="/admin/cohorts"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Manage Cohorts</div>
              <div className="text-sm text-muted-foreground">
                Create cohorts and assign tutors
              </div>
            </a>
            <a
              href="/admin/events"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Manage Events</div>
              <div className="text-sm text-muted-foreground">
                Create content, applied, or drop-in events
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity log coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
