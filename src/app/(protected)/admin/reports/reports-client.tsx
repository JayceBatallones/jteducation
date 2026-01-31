"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Calendar, CheckCircle } from "lucide-react";

interface CohortStat {
  id: string;
  name: string;
  color: string;
  program: string;
  capacity: number;
  enrolled: number;
  utilization: number;
  attendanceRate: number;
  upcomingEvents: number;
}

interface OverallStats {
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
  inactiveStudents: number;
  overallAttendanceRate: number;
  totalCohorts: number;
  avgUtilization: number;
}

interface ReportsClientProps {
  cohortStats: CohortStat[];
  overallStats: OverallStats;
}

export function ReportsClient({ cohortStats, overallStats }: ReportsClientProps) {
  const getUtilizationColor = (pct: number) => {
    if (pct >= 90) return "text-red-600";
    if (pct >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getAttendanceColor = (pct: number) => {
    if (pct >= 80) return "text-green-600";
    if (pct >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View attendance, utilization, and capacity metrics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalStudents}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">{overallStats.activeStudents} active</span>
              {" · "}
              <span className="text-yellow-600">{overallStats.pendingStudents} pending</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Attendance
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getAttendanceColor(overallStats.overallAttendanceRate)}`}>
              {overallStats.overallAttendanceRate}%
            </div>
            <Progress value={overallStats.overallAttendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Utilization
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUtilizationColor(overallStats.avgUtilization)}`}>
              {overallStats.avgUtilization}%
            </div>
            <Progress value={overallStats.avgUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Cohorts
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalCohorts}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {cohortStats.filter(c => c.upcomingEvents > 0).length} with upcoming events
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Performance</CardTitle>
          <CardDescription>
            Attendance rates and capacity utilization by cohort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cohortStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cohorts found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-center">Enrolled</TableHead>
                  <TableHead className="text-center">Utilization</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Upcoming</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohortStats.map((cohort) => (
                  <TableRow key={cohort.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cohort.color }}
                        />
                        <span className="font-medium">{cohort.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cohort.program}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {cohort.enrolled} / {cohort.capacity}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getUtilizationColor(cohort.utilization)}>
                        {cohort.utilization}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getAttendanceColor(cohort.attendanceRate)}>
                        {cohort.attendanceRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {cohort.upcomingEvents}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Capacity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Overview</CardTitle>
          <CardDescription>
            Visual representation of cohort capacity utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cohortStats.map((cohort) => (
              <div
                key={cohort.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: `${cohort.color}10`,
                  borderColor: cohort.color,
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{cohort.name}</div>
                  <Badge
                    variant={
                      cohort.utilization >= 90
                        ? "destructive"
                        : cohort.utilization >= 70
                        ? "secondary"
                        : "default"
                    }
                  >
                    {cohort.utilization >= 90
                      ? "Full"
                      : cohort.utilization >= 70
                      ? "Filling"
                      : "Available"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {cohort.enrolled} of {cohort.capacity} spots filled
                </div>
                <Progress
                  value={cohort.utilization}
                  className="h-2"
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {cohort.capacity - cohort.enrolled} spots remaining
                </div>
              </div>
            ))}
          </div>
          {cohortStats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No cohorts to display
            </p>
          )}
        </CardContent>
      </Card>

      {/* Student Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Student Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="text-2xl font-bold text-green-700">
                {overallStats.activeStudents}
              </div>
              <div className="text-sm text-green-600">Active (Paid)</div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">
                {overallStats.pendingStudents}
              </div>
              <div className="text-sm text-yellow-600">Pending Payment</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">
                {overallStats.inactiveStudents}
              </div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
