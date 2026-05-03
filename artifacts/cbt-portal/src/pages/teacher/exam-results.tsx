import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetTeacherExam, useGetExamResults, useDeleteExamResult, getGetExamResultsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Loader2, ArrowLeft, Download, UserX } from "lucide-react";
import { format } from "date-fns";

export default function ExamResults() {
  const { examId } = useParams();
  const id = parseInt(examId!, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: exam, isLoading: isExamLoading } = useGetTeacherExam(id);
  const { data: results, isLoading: isResultsLoading } = useGetExamResults(id);
  const deleteMutation = useDeleteExamResult();

  const [removeTarget, setRemoveTarget] = useState<{ resultId: number; studentName: string } | null>(null);

  const canResetExam =
    user?.role === "admin" ||
    !!user?.permissions?.reset_student_exam ||
    !!user?.permissions?.manage_exams ||
    !!user?.permissions?.view_all_exams;

  const exportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = ["Reg Number", "Name", "Class", "Score", "Total", "Percentage", "Grade", "Submitted At"];
    const csvContent = [
      headers.join(","),
      ...results.map(r => [
        `"${r.studentReg}"`,
        `"${r.studentName}"`,
        `"${r.studentClass}"`,
        r.score,
        r.total,
        `${r.percentage.toFixed(1)}%`,
        `"${r.grade}"`,
        `"${format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm:ss")}"`
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `exam_${id}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function handleRemove() {
    if (!removeTarget) return;
    deleteMutation.mutate({ examId: id, resultId: removeTarget.resultId }, {
      onSuccess: () => {
        toast({ title: "Result removed", description: `${removeTarget.studentName} can now retake this exam.` });
        qc.invalidateQueries({ queryKey: getGetExamResultsQueryKey(id) });
        setRemoveTarget(null);
      },
      onError: (e: any) =>
        toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to remove result" }),
    });
  }

  if (isExamLoading || isResultsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) return <div>Exam not found</div>;

  const avgScore = results?.length
    ? results.reduce((acc, r) => acc + r.percentage, 0) / results.length
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher/exams">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Results: {exam.subject}</h1>
            <p className="text-muted-foreground mt-1">
              Class: {exam.class}
              {avgScore != null && ` · Class Average: ${avgScore.toFixed(1)}%`}
            </p>
          </div>
        </div>
        <Button onClick={exportCSV} disabled={!results?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Performances</CardTitle>
          <CardDescription>
            {results?.length ?? 0} student{results?.length !== 1 ? "s" : ""} have completed this exam.
            {canResetExam && " Click 'Retake' to let a student redo the exam."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!results?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No students have taken this exam yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Submitted At</TableHead>
                  {canResetExam && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.studentReg}</TableCell>
                    <TableCell>{result.studentName}</TableCell>
                    <TableCell>{result.studentClass}</TableCell>
                    <TableCell>{result.score} / {result.total}</TableCell>
                    <TableCell>{result.percentage.toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                        result.grade === "A" ? "bg-green-100 text-green-800" :
                        result.grade === "B" ? "bg-blue-100 text-blue-800" :
                        result.grade === "C" ? "bg-yellow-100 text-yellow-800" :
                        result.grade === "D" ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {result.grade}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(result.submittedAt), "MMM d, yyyy HH:mm")}</TableCell>
                    {canResetExam && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoveTarget({ resultId: result.id, studentName: result.studentName })}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Allow Retake
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={v => { if (!v) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Allow Retake?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{removeTarget?.studentName}</strong>'s result for this exam. They will be able to take the exam again as if for the first time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Allow Retake
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
