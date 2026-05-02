import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetTeacherExam, useGetExamQuestions, useDeleteQuestion, useDeleteExam, getGetExamQuestionsQueryKey, getGetTeacherExamsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Settings } from "lucide-react";
import QuestionForm from "./question-form";
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

export default function ExamDetail() {
  const { examId } = useParams();
  const id = parseInt(examId!, 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isExamLoading } = useGetTeacherExam(id);
  const { data: questions, isLoading: isQuestionsLoading } = useGetExamQuestions(id);
  const deleteMutation = useDeleteQuestion();
  const deleteExamMutation = useDeleteExam();

  const [questionToEdit, setQuestionToEdit] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteExam, setShowDeleteExam] = useState(false);

  const canManage = user?.role === "admin" || !!user?.permissions?.manage_exams || !!user?.permissions?.view_all_exams;

  const handleDeleteQuestion = (questionId: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteMutation.mutate({ examId: id, questionId }, {
        onSuccess: () => {
          toast({ title: "Question deleted" });
          queryClient.invalidateQueries({ queryKey: getGetExamQuestionsQueryKey(id) });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to delete question", description: err.data?.error });
        }
      });
    }
  };

  function handleDeleteExam() {
    deleteExamMutation.mutate({ examId: id }, {
      onSuccess: () => {
        toast({ title: "Exam deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
        setLocation("/teacher/exams");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Failed to delete exam", description: err.data?.error });
        setShowDeleteExam(false);
      }
    });
  }

  const openNewForm = () => {
    setQuestionToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (q: any) => {
    setQuestionToEdit(q);
    setIsFormOpen(true);
  };

  if (isExamLoading || isQuestionsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) return <div>Exam not found</div>;

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
            <h1 className="text-3xl font-bold tracking-tight text-primary">{exam.subject}</h1>
            <p className="text-muted-foreground mt-1">Class: {exam.class} | Duration: {exam.durationMinutes} mins</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link href={`/teacher/exams/${id}/edit`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          )}
          {canManage && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowDeleteExam(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Exam
            </Button>
          )}
          {canManage && (
            <Button onClick={openNewForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{questionToEdit ? "Edit Question" : "Add New Question"}</DialogTitle>
          </DialogHeader>
          <QuestionForm
            examId={id}
            initialData={questionToEdit}
            onSuccess={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteExam} onOpenChange={setShowDeleteExam}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{exam.subject}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this exam along with all {questions?.length ?? 0} question{questions?.length !== 1 ? "s" : ""} and all student results. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteExam}
              disabled={deleteExamMutation.isPending}
            >
              {deleteExamMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {questions?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No questions have been added to this exam yet.</p>
              {canManage && <Button onClick={openNewForm}>Add First Question</Button>}
            </CardContent>
          </Card>
        ) : (
          questions?.map((q, index) => (
            <Card key={q.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium leading-normal pr-8">
                  <span className="text-muted-foreground mr-2">{index + 1}.</span>
                  {q.questionText}
                </CardTitle>
                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const isCorrect = q.correctOption === opt;
                    const optKey = `option${opt}` as keyof typeof q;
                    return (
                      <div
                        key={opt}
                        className={`p-3 rounded-md border ${isCorrect ? 'bg-green-50 border-green-200 font-medium' : 'bg-slate-50'}`}
                      >
                        <span className="font-bold mr-2">{opt}.</span>
                        {q[optKey] as string}
                        {isCorrect && <span className="ml-2 text-green-600 text-xs font-bold uppercase tracking-wider">(Correct)</span>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
