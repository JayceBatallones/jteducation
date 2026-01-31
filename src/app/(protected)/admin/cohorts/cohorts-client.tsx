"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, UserPlus, X } from "lucide-react";

interface Tutor {
  id: string;
  full_name: string | null;
  email: string;
}

interface CohortWithRelations {
  id: string;
  name: string;
  color: string;
  capacity: number;
  program_id: string;
  programs: { name: string };
  cohort_tutors: { tutor_id: string; profiles: Tutor }[];
  cohort_students: { count: number }[];
}

interface CohortsClientProps {
  cohorts: CohortWithRelations[];
  programs: { id: string; name: string }[];
  tutors: Tutor[];
  createCohort: (formData: FormData) => Promise<void>;
  deleteCohort: (id: string) => Promise<void>;
  assignTutor: (cohortId: string, tutorId: string) => Promise<void>;
  removeTutor: (cohortId: string, tutorId: string) => Promise<void>;
}

export function CohortsClient({
  cohorts,
  programs,
  tutors,
  createCohort,
  deleteCohort,
  assignTutor,
  removeTutor,
}: CohortsClientProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tutorDialogOpen, setTutorDialogOpen] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await createCohort(formData);
    setLoading(false);
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cohort? This will also delete all associated events and enrollments.")) {
      return;
    }
    await deleteCohort(id);
  };

  const handleAssignTutor = async (cohortId: string, tutorId: string) => {
    await assignTutor(cohortId, tutorId);
    setTutorDialogOpen(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cohorts</h1>
          <p className="text-muted-foreground">
            Manage cohorts within programs (e.g., JMSS-Y10-1)
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Cohort
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Cohort</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="program_id">Program</Label>
                  <NativeSelect
                    id="program_id"
                    name="program_id"
                    required
                    options={programs.map((p) => ({ value: p.id, label: p.name }))}
                    placeholder="Select program"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Cohort Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., JMSS-Y10-1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    defaultValue={10}
                    min={1}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading || programs.length === 0}>
                  {loading ? "Creating..." : "Create Cohort"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {programs.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Create a program first before adding cohorts.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          {cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cohorts created yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Tutors</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => (
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
                    <TableCell>{cohort.programs.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {cohort.cohort_tutors.map((ct) => (
                          <Badge key={ct.tutor_id} variant="secondary" className="gap-1">
                            {ct.profiles.full_name || ct.profiles.email}
                            <button
                              onClick={() => removeTutor(cohort.id, ct.tutor_id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Dialog
                          open={tutorDialogOpen === cohort.id}
                          onOpenChange={(open) => setTutorDialogOpen(open ? cohort.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Tutor to {cohort.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                              {tutors
                                .filter(
                                  (t) =>
                                    !cohort.cohort_tutors.some(
                                      (ct) => ct.tutor_id === t.id
                                    )
                                )
                                .map((tutor) => (
                                  <Button
                                    key={tutor.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleAssignTutor(cohort.id, tutor.id)}
                                  >
                                    {tutor.full_name || tutor.email}
                                  </Button>
                                ))}
                              {tutors.length === cohort.cohort_tutors.length && (
                                <p className="text-sm text-muted-foreground">
                                  All tutors are already assigned
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                    <TableCell>{cohort.cohort_students[0]?.count || 0}</TableCell>
                    <TableCell>{cohort.capacity}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cohort.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
