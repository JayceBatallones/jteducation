"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraduationCap, Trash2, Users } from "lucide-react";

interface WaitlistEntry {
  id: string;
  notes: string | null;
  waitlisted_at: string;
  program_id: string | null;
  user_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    status: string;
  } | {
    id: string;
    full_name: string | null;
    email: string;
    status: string;
  }[] | null;
  programs: {
    id: string;
    name: string;
  } | {
    id: string;
    name: string;
  }[] | null;
}

// Helper to get first item from array or single object
function getFirst<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] || null : val;
}

interface Cohort {
  id: string;
  name: string;
  color: string;
  capacity: number;
  program_id: string;
  programs: { name: string } | null;
  enrolled: number;
}

interface WaitlistClientProps {
  waitlist: WaitlistEntry[];
  cohorts: Cohort[];
  removeFromWaitlist: (waitlistId: string) => Promise<void>;
  placeStudent: (studentId: string, cohortId: string, waitlistId: string) => Promise<void>;
}

export function WaitlistClient({
  waitlist,
  cohorts,
  removeFromWaitlist,
  placeStudent,
}: WaitlistClientProps) {
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRemove = async (waitlistId: string) => {
    if (!confirm("Remove this student from the waitlist?")) return;

    try {
      await removeFromWaitlist(waitlistId);
      toast.success("Removed from waitlist");
    } catch {
      toast.error("Failed to remove from waitlist");
    }
  };

  const handlePlace = async (cohortId: string) => {
    if (!selectedEntry) return;

    setLoading(true);
    try {
      await placeStudent(selectedEntry.user_id, cohortId, selectedEntry.id);
      toast.success("Student placed in cohort");
      setSelectedEntry(null);
    } catch (err) {
      toast.error("Failed to place student");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableCohorts = (programId: string | null) => {
    if (!programId) return cohorts.filter(c => c.enrolled < c.capacity);
    return cohorts.filter(c => c.program_id === programId && c.enrolled < c.capacity);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Waitlist</h1>
        <p className="text-muted-foreground">
          Manage students waiting for cohort placement
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{waitlist.length}</div>
            <p className="text-sm text-muted-foreground">Total Waitlisted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {cohorts.filter(c => c.enrolled < c.capacity).length}
            </div>
            <p className="text-sm text-muted-foreground">Cohorts with Space</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {cohorts.reduce((sum, c) => sum + (c.capacity - c.enrolled), 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Available Spots</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waitlisted Students</CardTitle>
        </CardHeader>
        <CardContent>
          {waitlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students on the waitlist
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Waitlisted</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((entry) => {
                  const profile = getFirst(entry.profiles);
                  const program = getFirst(entry.programs);
                  return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {profile?.full_name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {profile?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {program?.name || "Any"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.waitlisted_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {entry.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                          title="Place in cohort"
                        >
                          <GraduationCap className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(entry.id)}
                          title="Remove from waitlist"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Place Student Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Place {getFirst(selectedEntry?.profiles ?? null)?.full_name || "Student"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-auto">
            {getAvailableCohorts(selectedEntry?.program_id || null).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available cohorts{selectedEntry?.program_id ? " for this program" : ""}.
                Consider creating a new cohort.
              </p>
            ) : (
              getAvailableCohorts(selectedEntry?.program_id || null).map((cohort) => (
                <div
                  key={cohort.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cohort.color }}
                    />
                    <div>
                      <div className="font-medium">{cohort.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cohort.enrolled}/{cohort.capacity}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePlace(cohort.id)}
                    disabled={loading}
                  >
                    Place
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
