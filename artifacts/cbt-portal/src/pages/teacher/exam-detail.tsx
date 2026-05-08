import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetTeacherExam, useGetExamQuestions, useDeleteQuestion, useDeleteExam, getGetExamQuestionsQueryKey, getGetTeacherExamsQueryKey, useCreateQuestion } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Plus, Edit, Trash2, Settings, Sparkles, Radio, WifiOff, Shuffle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

interface GeneratedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
}

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
  const createQuestionMutation = useCreateQuestion();

  const [questionToEdit, setQuestionToEdit] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteExam, setShowDeleteExam] = useState(false);

  const [isTogglingLive, setIsTogglingLive] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopics, setAiTopics] = useState("");
  const [aiCount, setAiCount] = useState("10");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());

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

  async function handleToggleLive() {
    if (!exam) return;
    setIsTogglingLive(true);
    try {
      const newLive = !(exam as any).isLive;
      await apiFetch(`/teacher/exams/${id}/toggle-live`, {
        method: "PATCH",
        body: JSON.stringify({ live: newLive }),
      });
      toast({ title: newLive ? "Exam published — students can now see it" : "Exam taken offline" });
      queryClient.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
      // Reload to refresh exam data
      window.location.reload();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update live status", description: err.message });
      setIsTogglingLive(false);
    }
  }

  const openNewForm = () => {
    setQuestionToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (q: any) => {
    setQuestionToEdit(q);
    setIsFormOpen(true);
  };

  async function generateQuestions() {
    if (!aiTopics.trim()) {
      toast({ variant: "destructive", title: "Please enter topics" });
      return;
    }
    const count = parseInt(aiCount, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      toast({ variant: "destructive", title: "Count must be between 1 and 50" });
      return;
    }
    setIsGenerating(true);
    try {
      const data = await apiFetch("/teacher/ai-questions", {
        method: "POST",
        body: JSON.stringify({
          subject: exam?.subject ?? "General",
          topics: aiTopics,
          count,
          difficulty: aiDifficulty,
        }),
      });
      setGeneratedQuestions(data.questions);
      setSelectedGenerated(new Set(data.questions.map((_: any, i: number) => i)));
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI generation failed", description: err.message });
    } finally {
      setIsGenerating(false);
    }
  }

  async function importSelected() {
    const toImport = generatedQuestions.filter((_, i) => selectedGenerated.has(i));
    if (toImport.length === 0) {
      toast({ variant: "destructive", title: "No questions selected" });
      return;
    }
    setIsImporting(true);
    let imported = 0;
    for (const q of toImport) {
      try {
        await createQuestionMutation.mutateAsync({ examId: id, data: q as any });
        imported++;
      } catch {
        /* continue */
      }
    }
    queryClient.invalidateQueries({ queryKey: getGetExamQuestionsQueryKey(id) });
    toast({ title: `${imported} question${imported !== 1 ? "s" : ""} imported successfully` });
    setIsImporting(false);
    setShowAiModal(false);
    setGeneratedQuestions([]);
    setSelectedGenerated(new Set());
  }

  function toggleGenerated(i: number) {
    setSelectedGenerated(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/teacher/exams">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">{exam.subject}</h1>
            <p className="text-muted-foreground mt-1">Class: {exam.class} | Duration: {exam.durationMinutes} mins</p>
            <div className="flex gap-2 mt-2">
              {(exam as any).isLive && (
                <Badge className="bg-green-100 text-green-700 border-green-300 border">Live</Badge>
              )}
              {(exam as any).shuffleQuestions && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 border flex items-center gap-1">
                  <Shuffle className="h-3 w-3" /> Shuffle On
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canManage && (
            <Button
              variant={(exam as any).isLive ? "outline" : "default"}
              onClick={handleToggleLive}
              disabled={isTogglingLive}
              className={(exam as any).isLive
                ? "border-orange-400 text-orange-700 hover:bg-orange-50"
                : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {isTogglingLive
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : (exam as any).isLive
                  ? <WifiOff className="h-4 w-4 mr-2" />
                  : <Radio className="h-4 w-4 mr-2" />}
              {(exam as any).isLive ? "Take Offline" : "Publish Exam"}
            </Button>
          )}
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
              onClick={() => setShowAiModal(true)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Set Questions
            </Button>
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

      {/* AI Question Generator Modal */}
      <Dialog open={showAiModal} onOpenChange={v => { if (!isGenerating && !isImporting) setShowAiModal(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Set Questions — {exam.subject}
            </DialogTitle>
          </DialogHeader>

          {generatedQuestions.length === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Topics / Areas to Cover</label>
                <Textarea
                  className="mt-1"
                  placeholder={`e.g. Photosynthesis, Cell Division, DNA Replication`}
                  value={aiTopics}
                  onChange={e => setAiTopics(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Number of Questions</label>
                  <Input className="mt-1" type="number" min={1} max={50} value={aiCount} onChange={e => setAiCount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAiModal(false)}>Cancel</Button>
                <Button onClick={generateQuestions} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{selectedGenerated.size} of {generatedQuestions.length} selected</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedGenerated(new Set(generatedQuestions.map((_, i) => i)))}>Select All</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedGenerated(new Set())}>Deselect All</Button>
                  <Button size="sm" variant="outline" onClick={() => { setGeneratedQuestions([]); setSelectedGenerated(new Set()); }}>Regenerate</Button>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {generatedQuestions.map((q, i) => (
                  <div
                    key={i}
                    onClick={() => toggleGenerated(i)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedGenerated.has(i) ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-gray-50 opacity-60"}`}
                  >
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={selectedGenerated.has(i)} onChange={() => toggleGenerated(i)} className="mt-1 cursor-pointer" onClick={e => e.stopPropagation()} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-2">{i + 1}. {q.questionText}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {(["A", "B", "C", "D"] as const).map(opt => (
                            <span key={opt} className={`text-xs p-1.5 rounded ${q.correctOption === opt ? "bg-green-100 text-green-700 font-medium" : "bg-white"}`}>
                              {opt}. {q[`option${opt}`]}
                              {q.correctOption === opt && <Badge className="ml-1 text-[10px] py-0 px-1 bg-green-600">✓</Badge>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAiModal(false)} disabled={isImporting}>Cancel</Button>
                <Button onClick={importSelected} disabled={isImporting || selectedGenerated.size === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : <>Import {selectedGenerated.size} Question{selectedGenerated.size !== 1 ? "s" : ""}</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {questions?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No questions have been added to this exam yet.</p>
              {canManage && (
                <div className="flex gap-2">
                  <Button onClick={openNewForm}>Add First Question</Button>
                  <Button variant="outline" onClick={() => setShowAiModal(true)} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Generate
                  </Button>
                </div>
              )}
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
