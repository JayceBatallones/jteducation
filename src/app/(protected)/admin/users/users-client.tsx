"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, GraduationCap, X, Users, Video, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Profile } from "@/types/database";

interface UserWithRelations extends Profile {
  cohort_students: {
    cohort_id: string;
    cohorts: { id: string; name: string; color: string };
  }[];
  parent_student_links: {
    student_id: string;
    profiles: { id: string; full_name: string | null; email: string };
  }[];
}

interface Cohort {
  id: string;
  name: string;
  color: string;
  program_id: string;
  capacity: number | null;
  stable_meet_link: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programs: { name: string } | { name: string }[] | any;
  _count?: { cohort_students: number };
  events?: { id: string; title: string; start_time: string; event_type: string }[] | null;
}

interface UsersClientProps {
  users: UserWithRelations[];
  cohorts: Cohort[];
  createUser: (formData: FormData) => Promise<void>;
  createParentStudentPair: (formData: FormData) => Promise<void>;
  enrollStudent: (studentId: string, cohortId: string) => Promise<void>;
  unenrollStudent: (studentId: string, cohortId: string) => Promise<void>;
  updateUserStatus: (userId: string, status: string) => Promise<void>;
}

export function UsersClient({
  users,
  cohorts,
  createUser,
  createParentStudentPair,
  enrollStudent,
  unenrollStudent,
  updateUserStatus,
}: UsersClientProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrollDialogUser, setEnrollDialogUser] = useState<string | null>(null);
  const [createTab, setCreateTab] = useState("pair");

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createUser(formData);
      toast.success("User created");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePair = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createParentStudentPair(formData);
      toast.success("Parent & student created");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create users");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (studentId: string, cohortId: string) => {
    try {
      await enrollStudent(studentId, cohortId);
      toast.success("Student enrolled");
      setEnrollDialogUser(null);
    } catch (error) {
      toast.error("Failed to enroll student");
    }
  };

  const handleUnenroll = async (studentId: string, cohortId: string) => {
    try {
      await unenrollStudent(studentId, cohortId);
      toast.success("Student unenrolled");
    } catch (error) {
      toast.error("Failed to unenroll student");
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await updateUserStatus(userId, status);
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const roleColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    admin: "destructive",
    tutor: "default",
    parent: "secondary",
    student: "outline",
  };

  const statusColors: Record<string, "success" | "warning" | "destructive"> = {
    customer: "success",
    pending_customer: "warning",
    inactive_customer: "destructive",
  };

  const students = users.filter((u) => u.role === "student");
  const parents = users.filter((u) => u.role === "parent");
  const tutors = users.filter((u) => u.role === "tutor");
  const admins = users.filter((u) => u.role === "admin");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage users, create accounts, and assign students to cohorts
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
            </DialogHeader>
            <Tabs value={createTab} onValueChange={setCreateTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pair">Parent + Student</TabsTrigger>
                <TabsTrigger value="single">Single User</TabsTrigger>
              </TabsList>

              <TabsContent value="pair">
                <form onSubmit={handleCreatePair}>
                  <div className="space-y-4 py-4">
                    <div className="text-sm font-medium">Parent Details</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_name">Parent Name</Label>
                        <Input id="parent_name" name="parent_name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_email">Parent Email</Label>
                        <Input id="parent_email" name="parent_email" type="email" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_password">Parent Password</Label>
                      <Input id="parent_password" name="parent_password" type="password" required />
                    </div>

                    <div className="border-t pt-4 text-sm font-medium">Student Details</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="student_name">Student Name</Label>
                        <Input id="student_name" name="student_name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student_email">Student Email</Label>
                        <Input id="student_email" name="student_email" type="email" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student_password">Student Password</Label>
                      <Input id="student_password" name="student_password" type="password" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input id="timezone" name="timezone" defaultValue="Australia/Melbourne" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creating..." : "Create Parent & Student"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="single">
                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input id="full_name" name="full_name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" name="password" type="password" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        id="role"
                        name="role"
                        required
                        options={[
                          { value: "student", label: "Student" },
                          { value: "parent", label: "Parent" },
                          { value: "tutor", label: "Tutor" },
                          { value: "admin", label: "Admin" },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input id="timezone" name="timezone" defaultValue="Australia/Melbourne" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-sm text-muted-foreground">Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{parents.length}</div>
            <p className="text-sm text-muted-foreground">Parents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tutors.length}</div>
            <p className="text-sm text-muted-foreground">Tutors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-sm text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cohort / Linked</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || "-"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleColors[user.role]}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[user.status]}>
                      {user.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === "student" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.cohort_students?.map((cs) => (
                          <Badge key={cs.cohort_id} style={{ backgroundColor: cs.cohorts?.color }}>
                            {cs.cohorts?.name}
                            <button
                              onClick={() => handleUnenroll(user.id, cs.cohort_id)}
                              className="ml-1 hover:opacity-70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Dialog
                          open={enrollDialogUser === user.id}
                          onOpenChange={(open) => setEnrollDialogUser(open ? user.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <GraduationCap className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Place {user.full_name || user.email} in Cohort</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 max-h-[400px] overflow-auto">
                              {cohorts
                                .filter(
                                  (c) =>
                                    !user.cohort_students?.some(
                                      (cs) => cs.cohort_id === c.id
                                    )
                                )
                                .map((cohort) => {
                                  const enrolled = cohort._count?.cohort_students || 0;
                                  const capacity = cohort.capacity || 0;
                                  const isFull = capacity > 0 && enrolled >= capacity;
                                  const contentEvents = cohort.events?.filter(e => e.event_type === "content") || [];

                                  return (
                                    <div
                                      key={cohort.id}
                                      className="border rounded-lg p-3 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: cohort.color }}
                                          />
                                          <span className="font-medium">{cohort.name}</span>
                                        </div>
                                        <Badge variant="secondary">
                                          {Array.isArray(cohort.programs) ? cohort.programs[0]?.name : cohort.programs?.name}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {enrolled}/{capacity || "∞"}
                                          {isFull && <Badge variant="destructive" className="ml-1 text-xs">Full</Badge>}
                                        </span>
                                        {cohort.stable_meet_link && (
                                          <span className="flex items-center gap-1">
                                            <Video className="h-3 w-3" />
                                            Meet link set
                                          </span>
                                        )}
                                      </div>

                                      {contentEvents.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1 mb-1">
                                            <Calendar className="h-3 w-3" />
                                            Content classes:
                                          </span>
                                          {contentEvents.slice(0, 2).map(e => (
                                            <div key={e.id} className="ml-4">
                                              {e.title} - {format(new Date(e.start_time), "EEE h:mm a")}
                                            </div>
                                          ))}
                                          {contentEvents.length > 2 && (
                                            <div className="ml-4">+{contentEvents.length - 2} more</div>
                                          )}
                                        </div>
                                      )}

                                      <Button
                                        variant={isFull ? "outline" : "default"}
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => handleEnroll(user.id, cohort.id)}
                                      >
                                        {isFull ? "Place (Override Capacity)" : "Place in Cohort"}
                                      </Button>
                                    </div>
                                  );
                                })}
                              {cohorts.filter(c => !user.cohort_students?.some(cs => cs.cohort_id === c.id)).length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  No cohorts available or student already enrolled in all
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    {user.role === "parent" &&
                      user.parent_student_links?.map((link) => (
                        <Badge key={link.student_id} variant="outline">
                          → {link.profiles?.full_name || link.profiles?.email}
                        </Badge>
                      ))}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      options={[
                        { value: "customer", label: "Active" },
                        { value: "pending_customer", label: "Pending" },
                        { value: "inactive_customer", label: "Inactive" },
                      ]}
                      className="w-[120px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
