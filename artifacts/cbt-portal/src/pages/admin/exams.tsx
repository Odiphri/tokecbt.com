import { useState } from "react";
import { useGetAdminExams, useDeleteAdminExam, useGetAdminExamResults, useDeleteAdminExamResult, getGetAdminExamsQueryKey, getGetAdminExamResultsQueryKey } from "@workspace/api-client-react";
import type { ExamWithStats, ResultWithStudent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, X, Users, ChevronDown, ChevronUp, Download, UserX } from "lucide-react";
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
import { format } from "date-fns";

function getExamStatus(exam: { startTime?: string | null; endTime?: string | null }) {
  const now = new Date();
  if (exam.startTime && new Date(exam.startTime) > now) return "upcoming";
  if (exam.endTime && new Date(exam.endTime) < now) return "expired";
  return "live";
}

function ExamStatusBadge({ exam }: { exam: ExamWithStats }) {
  const status = getExamStatus(exam);
  if (status === "upcoming") return <Badge variant="outline" className="text-yellow-600 border-yellow-400 bg-yellow-50">Upcoming</Badge>;
  if (status === "expired") return <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50">Expired</Badge>;
  return <Badge variant="outline" className="text-green-600 border-green-400 bg-green-50">Live</Badge>;
}

function ExamResultsPanel({ examId, onClose }: { examId: number; onClose: () => void }) {
  const { data: results, isLoading } = useGetAdminExamResults(examId);
  const deleteMutation = useDeleteAdminExamResult();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [removeTarget, setRemoveTarget] = useState<{ resultId: number; studentName: string } | null>(null);

  function handleRemove() {
    if (!removeTarget) return;
    deleteMutation.mutate({ examId, resultId: removeTarget.resultId }, {
      onSuccess: () => {
        toast({ title: "Result removed", description: `${removeTarget.studentName} can now retake this exam.` });
        qc.invalidateQueries({ queryKey: getGetAdminExamResultsQueryKey(examId) });
        qc.invalidateQueries({ queryKey: getGetAdminExamsQueryKey() });
        setRemoveTarget(null);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed" }),
    });
  }

  const exportCSV = () => {
    if (!results?.length) return;
    const headers = ["Reg Number", "Name", "Class", "Score", "Total", "Percentage", "Grade", "Submitted At"];
    const csv = [headers.join(","), ...results.map(r => [
      `"${r.studentReg}"`, `"${r.studentName}"`, `"${r.studentClass}"`,
      r.score, r.total, `${r.percentage.toFixed(1)}%`, `"${r.grade}"`,
      `"${format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm:ss")}"`
    ].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `exam_${examId}_results.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="mt-4 border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">Results ({results?.length ?? 0} students)</h4>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={!results?.length}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !results?.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">No students have attempted this exam.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reg No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.studentReg}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.studentClass}</TableCell>
                <TableCell>{r.score}/{r.total} ({r.percentage.toFixed(1)}%)</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.grade === "A" ? "bg-green-100 text-green-800" :
                    r.grade === "B" ? "bg-blue-100 text-blue-800" :
                    r.grade === "C" ? "bg-yellow-100 text-yellow-800" :
                    r.grade === "D" ? "bg-orange-100 text-orange-800" :
                    "bg-red-100 text-red-800"
                  }`}>{r.grade}</span>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(r.submittedAt), "MMM d, HH:mm")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget({ resultId: r.id, studentName: r.studentName })}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={v => { if (!v) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Result?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{removeTarget?.studentName}</strong>'s result. They will be able to retake the exam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleRemove}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Result
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminExams() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: exams, isLoading } = useGetAdminExams();
  const deleteMutation = useDeleteAdminExam();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [expandedResults, setExpandedResults] = useState<number | null>(null);

  const filtered = (exams ?? []).filter(e =>
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    e.class.toLowerCase().includes(search.toLowerCase()) ||
    e.createdBy.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ examId: deleteTarget }, {
      onSuccess: () => {
        toast({ title: "Exam deleted successfully" });
        qc.invalidateQueries({ queryKey: getGetAdminExamsQueryKey() });
        setDeleteTarget(null);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to delete exam" }),
    });
  }

  function toggleResults(examId: number) {
    setExpandedResults(prev => prev === examId ? null : examId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Exams</h1>
        <p className="text-muted-foreground">View and manage all exams across all staff.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Management</CardTitle>
          <CardDescription>
            {exams?.length ?? 0} total exams
          </CardDescription>
          <div className="flex items-center gap-4 mt-2">
            <Input
              placeholder="Search by subject, class or creator..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No exams found.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(exam => (
                <div key={exam.id} className="border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{exam.subject}</h3>
                        <ExamStatusBadge exam={exam} />
                        <Badge variant="outline" className="font-mono text-xs">{exam.class}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span>By: {exam.createdBy}</span>
                        <span>{exam.questionCount} questions</span>
                        <span>{exam.durationMinutes} min</span>
                        {exam.startTime && <span>Start: {format(new Date(exam.startTime), "MMM d, HH:mm")}</span>}
                        {exam.endTime && <span>End: {format(new Date(exam.endTime), "MMM d, HH:mm")}</span>}
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="h-3 w-3" /> {exam.attemptCount} attempts
                        </span>
                        {exam.averageScore != null && (
                          <span>Avg: {exam.averageScore.toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleResults(exam.id)}
                        className="text-xs"
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Results
                        {expandedResults === exam.id ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => setDeleteTarget(exam.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {expandedResults === exam.id && (
                    <div className="px-4 pb-4">
                      <ExamResultsPanel examId={exam.id} onClose={() => setExpandedResults(null)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this exam, all its questions and all student results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-700 hover:bg-rose-800" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
