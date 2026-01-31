"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, X, Calendar } from "lucide-react";

interface RescheduleRequest {
  id: string;
  event_id: string;
  user_id: string;
  notes: string | null;
  status: string;
  requested_at: string;
  admin_notes: string | null;
  events: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  } | {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  }[] | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | {
    full_name: string | null;
    email: string;
  }[] | null;
}

interface ReschedulesClientProps {
  requests: RescheduleRequest[];
  handleRequest: (
    requestId: string,
    action: "approved" | "denied",
    adminNotes: string
  ) => Promise<{ error?: string }>;
}

// Helper to get first item from array or single object
function getFirst<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] || null : val;
}

export function ReschedulesClient({ requests, handleRequest }: ReschedulesClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<RescheduleRequest | null>(null);
  const [action, setAction] = useState<"approved" | "denied" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const handleSubmit = async () => {
    if (!selectedRequest || !action) return;

    setLoading(true);
    try {
      const result = await handleRequest(selectedRequest.id, action, adminNotes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Request ${action}`);
        setSelectedRequest(null);
        setAction(null);
        setAdminNotes("");
      }
    } catch {
      toast.error("Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (request: RescheduleRequest, selectedAction: "approved" | "denied") => {
    setSelectedRequest(request);
    setAction(selectedAction);
    setAdminNotes("");
  };

  const filteredRequests = filter === "pending"
    ? requests.filter(r => r.status === "pending")
    : requests;

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    approved: "default",
    denied: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reschedule Requests</h1>
        <p className="text-muted-foreground">
          Review and handle student reschedule requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Requests</CardTitle>
              <CardDescription>
                {filter === "pending"
                  ? `${filteredRequests.length} pending requests`
                  : `${filteredRequests.length} total requests`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("pending")}
              >
                Pending
              </Button>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filter === "pending" ? "No pending requests" : "No requests"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Original Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const event = getFirst(request.events);
                  const profile = getFirst(request.profiles);
                  return (
                  <TableRow key={request.id}>
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
                    <TableCell className="font-medium">
                      {event?.title}
                    </TableCell>
                    <TableCell>
                      {event?.start_time && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(event.start_time), "MMM d, h:mm a")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                        {request.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.requested_at), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(request, "approved")}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(request, "denied")}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!action} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approved" ? "Approve" : "Deny"} Reschedule Request
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (() => {
            const selEvent = getFirst(selectedRequest.events);
            const selProfile = getFirst(selectedRequest.profiles);
            return (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Student: </span>
                  <span className="font-medium">{selProfile?.full_name}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Event: </span>
                  <span className="font-medium">{selEvent?.title}</span>
                </div>
                {selEvent?.start_time && (
                  <div>
                    <span className="text-sm text-muted-foreground">Date: </span>
                    <span className="font-medium">
                      {format(new Date(selEvent.start_time), "EEEE, MMMM d · h:mm a")}
                    </span>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Reason: </span>
                    <span>{selectedRequest.notes}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Response to student (optional)</Label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={action === "approved"
                    ? "E.g., We've rescheduled you to the Wednesday session..."
                    : "E.g., Sorry, no alternative slots available this week..."}
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background"
                />
              </div>
            </div>
          );})()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant={action === "approved" ? "default" : "destructive"}
            >
              {loading ? "Processing..." : action === "approved" ? "Approve" : "Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
