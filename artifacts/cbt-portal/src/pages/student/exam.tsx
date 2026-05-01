import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useGetStudentExam, useSubmitExam } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Clock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function StudentExam() {
  const { examId } = useParams();
  const id = parseInt(examId || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: exam, isLoading, error } = useGetStudentExam(id, {
    query: {
      enabled: !!id,
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  const submitMutation = useSubmitExam();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

  // Timer logic
  useEffect(() => {
    if (exam && timeLeft === null) {
      setTimeLeft(exam.durationMinutes * 60);
    }
  }, [exam, timeLeft]);

  const submitExamRef = useRef(submitMutation.mutate);
  submitExamRef.current = submitMutation.mutate;

  const currentAnswersRef = useRef(answers);
  currentAnswersRef.current = answers;

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      toast({
        title: "Time's up!",
        description: "Your exam is being automatically submitted.",
      });
      submitExamRef.current({
        examId: id,
        data: { answers: currentAnswersRef.current }
      }, {
        onSuccess: () => {
          setLocation("/student/results");
        }
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, id, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Exam Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested exam could not be loaded or is not available.</p>
        <Button onClick={() => setLocation("/student/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  if (!exam.questions || exam.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Questions</h2>
        <p className="text-muted-foreground mb-4">This exam has no questions configured.</p>
        <Button onClick={() => setLocation("/student/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft !== null && timeLeft < 300; // less than 5 mins

  const currentQuestion = exam.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = answeredCount === exam.questions.length;

  const handleSelectOption = (option: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: option,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      examId: id,
      data: { answers }
    }, {
      onSuccess: () => {
        toast({
          title: "Exam Submitted",
          description: "Your answers have been saved.",
        });
        setLocation("/student/results");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: err.data?.error || "An error occurred.",
        });
        setIsSubmitDialogOpen(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{exam.subject}</h1>
            <p className="text-sm opacity-90">Class {exam.class}</p>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xl font-bold bg-primary-foreground/10 border",
            isLowTime ? "text-red-400 border-red-400 animate-pulse" : "border-primary-foreground/20"
          )}>
            <Clock className="h-5 w-5" />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-lg min-h-[400px] flex flex-col">
            <CardContent className="p-6 md:p-8 flex-1 flex flex-col">
              <div className="mb-6 flex justify-between items-center text-sm font-medium text-muted-foreground border-b pb-4">
                <span>Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
                <span className={cn(isAllAnswered ? "text-green-600" : "")}>{answeredCount} Answered</span>
              </div>
              
              <h2 className="text-xl md:text-2xl font-medium mb-8 leading-relaxed">
                {currentQuestion.questionText}
              </h2>

              <div className="space-y-3 mt-auto">
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const optionKey = `option${opt}` as keyof typeof currentQuestion;
                  const isSelected = answers[currentQuestion.id] === opt;
                  
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border hover:border-primary/50 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                        {opt}
                      </div>
                      <span className="text-lg">{currentQuestion[optionKey] as string}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handlePrev} 
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Previous
            </Button>
            
            {currentQuestionIndex === exam.questions.length - 1 ? (
              <Button 
                size="lg" 
                onClick={() => setIsSubmitDialogOpen(true)}
                className={cn(isAllAnswered && "bg-green-700 hover:bg-green-800 text-white")}
              >
                Finish Exam
              </Button>
            ) : (
              <Button 
                size="lg" 
                onClick={handleNext}
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Navigator */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Navigator</h3>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={cn(
                        "h-10 w-10 rounded-full text-sm font-medium transition-all flex items-center justify-center border",
                        isCurrent ? "ring-2 ring-primary ring-offset-2 border-primary bg-primary text-primary-foreground" :
                        isAnswered ? "bg-accent/20 border-accent/50 text-accent-foreground" :
                        "bg-background border-border text-muted-foreground hover:bg-slate-100"
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 pt-4 border-t">
                <Button 
                  className={cn("w-full", isAllAnswered && "bg-green-700 hover:bg-green-800")} 
                  size="lg"
                  onClick={() => setIsSubmitDialogOpen(true)}
                >
                  Submit Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
            <DialogDescription>
              {isAllAnswered 
                ? "You have answered all questions. Are you ready to submit?"
                : `You still have ${exam.questions.length - answeredCount} unanswered questions. Are you sure you want to submit?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
              Continue Exam
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitMutation.isPending}
              className={cn(isAllAnswered ? "bg-green-700 hover:bg-green-800" : "")}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : "Yes, Submit Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
