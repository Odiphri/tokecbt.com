import { useState } from "react";
import { useGetTeacherExams, useDeleteExam, useToggleExamResults, getGetTeacherExamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Users, Eye, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TeacherExams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: exams, isLoading } = useGetTeacherExams();
  const deleteMutation = useDeleteExam();
  const toggleMutation = useToggleExamResults();

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; subject: string } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const canViewAll = user?.role === "admin" || !!user?.permissions?.view_all_exams;
  const canManageExams = user?.role === "admin" || !!user?.permissions?.manage_exams;

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ examId: deleteTarget.id }, {
      onSuccess: () => {
        toast({ title: "Exam deleted successfully" });
        qc.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
        setDeleteTarget(null);
      },
      onError: (e: any) =>
        toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to delete exam" }),
    });
  }

  function handleToggleResults(examId: number, currentEnabled: boolean) {
    setTogglingId(examId);
    toggleMutation.mutate(
      { examId, data: { enabled: !currentEnabled } },
      {
        onSuccess: () => {
          toast({ title: !currentEnabled ? "Results enabled for students" : "Results hidden from students" });
          qc.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to update" }),
        onSettled: () => setTogglingId(null),
      }
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {canViewAll ? "All School Exams" : "My Exams"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {canViewAll
              ? "Viewing all exams across all staff members."
              : "Create and manage your computer based tests."}
          </p>
        </div>
        {canManageExams && (
          <Link href="/teacher/exams/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{canViewAll ? "All Exams" : "My Exams"}</CardTitle>
          <CardDescription>
            {canViewAll
              ? "All exams created by any staff member."
              : "A list of all exams you have created."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !exams || exams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {canManageExams
                ? 'No exams yet. Click "Create Exam" to get started.'
                : "No exams are available yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  {canViewAll && <TableHead>Created By</TableHead>}
                  <TableHead>Questions</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Results Visible</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => {
                  const isOwner = user?.id === exam.createdBy || canViewAll;
                  const canEdit = canManageExams || canViewAll;
                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.subject}</TableCell>
                      <TableCell>{exam.class}</TableCell>
                      {canViewAll && (
                        <TableCell className="font-mono text-xs text-muted-foreground">{exam.createdBy}</TableCell>
                      )}
                      <TableCell>{exam.questionCount}</TableCell>
                      <TableCell>{exam.attemptCount}</TableCell>
                      <TableCell>
                        {exam.averageScore != null ? `${exam.averageScore.toFixed(1)}%` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={exam.resultsEnabled}
                            disabled={!canEdit || togglingId === exam.id}
                            onCheckedChange={() => handleToggleResults(exam.id, exam.resultsEnabled)}
                          />
                          <Badge variant={exam.resultsEnabled ? "default" : "secondary"} className="text-xs">
                            {exam.resultsEnabled ? "On" : "Off"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/teacher/exams/${exam.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/teacher/exams/${exam.id}/results`}>
                            <Button variant="ghost" size="sm">
                              <Users className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEdit && (
                            <Link href={`/teacher/exams/${exam.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: exam.id, subject: exam.subject })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.subject}</strong> along with all its questions and student results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
