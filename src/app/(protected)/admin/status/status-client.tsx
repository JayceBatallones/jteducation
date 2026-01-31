"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, AlertTriangle, History, RefreshCw } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface StatusChange {
  id: string;
  user_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  reason: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: { full_name: string | null; email: string } | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changed_by_profile: { full_name: string | null } | any;
}

interface StatusManagementClientProps {
  users: User[];
  statusCounts: {
    customer: number;
    pending_customer: number;
    inactive_customer: number;
  };
  recentChanges: StatusChange[];
  bulkUpdateStatus: (
    userIds: string[],
    newStatus: string,
    reason: string
  ) => Promise<{ error?: string; success?: boolean; count?: number }>;
  getPaymentPendingUsers: () => Promise<User[]>;
}

export function StatusManagementClient({
  users,
  statusCounts,
  recentChanges,
  bulkUpdateStatus,
  getPaymentPendingUsers,
}: StatusManagementClientProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter((u) => {
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    if (filterRole !== "all" && u.role !== filterRole) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleBulkUpdate = async () => {
    if (!newStatus || selectedUsers.length === 0) return;

    setLoading(true);
    try {
      const result = await bulkUpdateStatus(selectedUsers, newStatus, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${result.count} users`);
        setShowBulkDialog(false);
        setSelectedUsers([]);
        setNewStatus("");
        setReason("");
      }
    } catch {
      toast.error("Failed to update statuses");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateExpired = async () => {
    setLoading(true);
    try {
      const expiredUsers = await getPaymentPendingUsers();
      if (expiredUsers.length === 0) {
        toast.info("No expired pending users found");
        return;
      }

      const result = await bulkUpdateStatus(
        expiredUsers.map((u) => u.id),
        "inactive_customer",
        "Auto-deactivated: payment pending for 14+ days"
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Deactivated ${result.count} expired users`);
      }
    } catch {
      toast.error("Failed to deactivate expired users");
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    customer: "default",
    pending_customer: "secondary",
    inactive_customer: "destructive",
  };

  const getFirst = <T,>(val: T | T[] | null): T | null => {
    if (!val) return null;
    return Array.isArray(val) ? val[0] || null : val;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Status Management</h1>
        <p className="text-muted-foreground">
          Manage user statuses and perform bulk actions
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.customer}</div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.pending_customer}</div>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.inactive_customer}</div>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bulk Actions</CardTitle>
              <CardDescription>
                Select users and perform bulk status changes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDeactivateExpired}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Deactivate Expired
              </Button>
              <Button
                onClick={() => setShowBulkDialog(true)}
                disabled={selectedUsers.length === 0}
              >
                Update Selected ({selectedUsers.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="customer">Active</SelectItem>
                  <SelectItem value="pending_customer">Pending</SelectItem>
                  <SelectItem value="inactive_customer">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Role:</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedUsers.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) =>
                        handleSelectUser(user.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.full_name || "-"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[user.status]}>
                      {user.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Status Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent changes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentChanges.map((change) => {
                  const profile = getFirst(change.profiles);
                  const changedBy = getFirst(change.changed_by_profile);
                  return (
                    <TableRow key={change.id}>
                      <TableCell>
                        {profile?.full_name || profile?.email || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[change.old_status]} className="mr-1">
                          {change.old_status.replace("_", " ")}
                        </Badge>
                        →
                        <Badge variant={statusColors[change.new_status]} className="ml-1">
                          {change.new_status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {change.reason || "-"}
                      </TableCell>
                      <TableCell>{changedBy?.full_name || "System"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(change.changed_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {selectedUsers.length} Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Active (customer)</SelectItem>
                  <SelectItem value="pending_customer">Pending Payment</SelectItem>
                  <SelectItem value="inactive_customer">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for status change..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={loading || !newStatus}>
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
