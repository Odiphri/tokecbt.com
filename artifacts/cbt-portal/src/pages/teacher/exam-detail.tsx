import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetTeacherExam, useGetExamQuestions, useDeleteQuestion, getGetExamQuestionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Settings } from "lucide-react";
import QuestionForm from "./question-form"; // We'll create this inline or separate component

export default function ExamDetail() {
  const { examId } = useParams();
  const id = parseInt(examId!, 10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isExamLoading } = useGetTeacherExam(id);
  const { data: questions, isLoading: isQuestionsLoading } = useGetExamQuestions(id);
  const deleteMutation = useDeleteQuestion();

  const [questionToEdit, setQuestionToEdit] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = (questionId: number) => {
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
          <Link href={`/teacher/exams/${id}/edit`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button onClick={openNewForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
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

      <div className="space-y-4">
        {questions?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No questions have been added to this exam yet.</p>
              <Button onClick={openNewForm}>Add First Question</Button>
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
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditForm(q)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
