import { useState } from "react";
import { useGetAdminRequests, useReviewRequest, getGetAdminRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, User, Tag, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type RequestRecord = {
  id: number;
  userId: string;
  userName: string;
  userClass?: string | null;
  type: "name_change" | "role_change";
  currentValue: string;
  requestedValue: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  if (status === "approved") return <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
  return <Badge variant="outline" className="text-red-600 border-red-400 bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "name_change") return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Name Change</Badge>;
  return <Badge variant="secondary"><Tag className="h-3 w-3 mr-1" />Role Change</Badge>;
}

export default function AdminRequests() {
  const { data: requests, isLoading } = useGetAdminRequests();
  const reviewMutation = useReviewRequest();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [reviewDialog, setReviewDialog] = useState<{ request: RequestRecord; action: "approved" | "rejected" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const pending = (requests ?? []).filter(r => r.status === "pending");
  const reviewed = (requests ?? []).filter(r => r.status !== "pending");

  function openReview(request: RequestRecord, action: "approved" | "rejected") {
    setReviewDialog({ request, action });
    setReviewNote("");
  }

  function submitReview() {
    if (!reviewDialog) return;
    reviewMutation.mutate(
      { id: reviewDialog.request.id, data: { status: reviewDialog.action, reviewNote: reviewNote || null } },
      {
        onSuccess: () => {
          toast({
            title: reviewDialog.action === "approved" ? "Request approved" : "Request rejected",
            description: reviewDialog.action === "approved"
              ? "The change has been applied to the student's account."
              : "The request has been declined.",
          });
          qc.invalidateQueries({ queryKey: getGetAdminRequestsQueryKey() });
          setReviewDialog(null);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to review request", description: err?.data?.error || "Please try again." });
        },
      }
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Student Requests</h1>
            <p className="text-muted-foreground mt-1">Review and manage student name/role change requests.</p>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pending.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold w-5 h-5">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : pending.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="text-muted-foreground font-medium">No pending requests</p>
                  <p className="text-xs text-muted-foreground">All student requests have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pending.map(r => (
                  <RequestCard key={r.id} request={r as RequestRecord} onApprove={() => openReview(r as RequestRecord, "approved")} onReject={() => openReview(r as RequestRecord, "rejected")} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="mt-4">
            {reviewed.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                  No reviewed requests yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviewed.map(r => (
                  <RequestCard key={r.id} request={r as RequestRecord} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "approved" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === "approved"
                ? `This will update the student's ${reviewDialog.request.type === "name_change" ? "name" : "role"} to "${reviewDialog?.request.requestedValue}".`
                : "The student's account will not be changed."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Review Note (optional)</Label>
            <Textarea
              placeholder="Add a note to the student..."
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              variant={reviewDialog?.action === "approved" ? "default" : "destructive"}
              onClick={submitReview}
              disabled={reviewMutation.isPending}
            >
              {reviewDialog?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function RequestCard({ request, onApprove, onReject }: { request: RequestRecord; onApprove?: () => void; onReject?: () => void }) {
  const isPending = request.status === "pending";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{request.userName}</CardTitle>
            <CardDescription className="text-xs">
              Reg: {request.userId} {request.userClass ? `· Class: ${request.userClass}` : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <TypeBadge type={request.type} />
            <StatusBadge status={request.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Current</p>
            <p className="font-medium">{request.currentValue}</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Requested</p>
            <p className="font-medium text-primary">{request.requestedValue}</p>
          </div>
        </div>
        {request.reviewNote && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <span className="font-medium">Note: </span>{request.reviewNote}
          </div>
        )}
        {request.reviewedBy && (
          <p className="text-xs text-muted-foreground">Reviewed by: {request.reviewedBy}</p>
        )}
        <p className="text-xs text-muted-foreground">Submitted: {new Date(request.createdAt).toLocaleString()}</p>
        {isPending && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onApprove} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={onReject} className="flex-1">
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
